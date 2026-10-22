#!/usr/bin/env bash
# Passive deployment check. Plain GET/HEAD requests to public hosts, reading
# status and headers only. No credentials, no posts, no fuzzing.
#
#   scripts/deploy-check.sh [host] [--ports]
#
# host     app host to check (default events-dev.fluid-movement.de; after
#          cutover events.freestyledisc.org)
# --ports  also TCP connect-and-close on the relevant ports, IPv4 and IPv6
#          (opt-in: it is not an HTTP request; Linux only, needs getent and timeout)
#
# Exit status is the number of FAIL lines. A header the code sets but the live
# host lacks may just mean "not yet deployed"; read the FAIL lines with that in mind.
set -u

HOST=events-dev.fluid-movement.de
PORTS=0
for arg in "$@"; do
	case "$arg" in
		--ports) PORTS=1 ;;
		*) HOST="$arg" ;;
	esac
done
GLITCHTIP=glitchtip.fluid-movement.de
COOLIFY=coolify.fluid-movement.de
FAILS=0

pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAILS=$((FAILS + 1)); }
info() { echo "INFO  $1"; }

# Lower-cased response headers of a GET (no redirects followed); status on the first line.
fetch() {
	curl -sS -o /dev/null -D - --max-time 15 "$1" 2>/dev/null |
		tr -d '\r' | awk 'NR==1{print $2; next} {print tolower($0)}'
}
status_of() { head -n1 <<<"$1"; }
header_of() { grep -m1 "^$2:" <<<"$1" | sed "s/^$2: *//"; }

expect_header() { # headers name expected-substring label
	local v
	v=$(header_of "$1" "$2")
	# fetch lower-cases whole header lines, so compare against the lower-cased expectation.
	if [[ -n "$v" && "$v" == *"$(tr '[:upper:]' '[:lower:]' <<<"$3")"* ]]; then pass "$4: $2 contains '$3'"; else fail "$4: $2 expected '$3', got '${v:-<missing>}'"; fi
}

echo "== App: $HOST =="
H=$(fetch "http://$HOST/")
S=$(status_of "$H")
LOC=$(header_of "$H" location)
if [[ "$S" =~ ^30[1278]$ && "$LOC" == "https://$HOST"* ]]; then pass "http->https redirect ($S -> $LOC)"; else fail "http->https redirect expected, got $S ${LOC:+-> $LOC}"; fi

for path in / /sign-in /events; do
	H=$(fetch "https://$HOST$path")
	S=$(status_of "$H")
	[[ "$S" == 200 ]] && pass "GET $path 200" || fail "GET $path expected 200, got $S"
	expect_header "$H" strict-transport-security max-age= "$path"
	expect_header "$H" x-content-type-options nosniff "$path"
	expect_header "$H" referrer-policy strict-origin-when-cross-origin "$path"
	expect_header "$H" x-frame-options DENY "$path"
	expect_header "$H" permissions-policy "camera=()" "$path"
	CSP=$(header_of "$H" content-security-policy)
	SCRIPT=$(grep -o "script-src[^;]*" <<<"$CSP")
	if [[ -z "$CSP" ]]; then fail "$path: content-security-policy missing"
	elif [[ "$SCRIPT" == *"unsafe-inline"* || "$SCRIPT" == *"unsafe-eval"* ]]; then fail "$path: script-src allows unsafe-*: $SCRIPT"
	elif [[ "$SCRIPT" != *"nonce-"* ]]; then fail "$path: script-src has no nonce: $SCRIPT"
	else pass "$path: CSP script-src has nonce, no unsafe-*"; fi
	for d in "object-src 'none'" "frame-ancestors 'none'" "base-uri 'self'" "form-action 'self'"; do
		[[ "$CSP" == *"$d"* ]] && pass "$path: CSP has $d" || fail "$path: CSP missing $d"
	done
done

H=$(fetch "https://$HOST/healthz")
S=$(status_of "$H")
BODY=$(curl -sS --max-time 15 "https://$HOST/healthz" 2>/dev/null)
[[ "$S" == 200 && "$BODY" == "ok" ]] && pass "/healthz 200 body 'ok'" || fail "/healthz expected 200 'ok', got $S '${BODY:0:40}'"
expect_header "$H" content-security-policy "default-src 'none'; frame-ancestors 'none'" /healthz
expect_header "$H" x-content-type-options nosniff /healthz

echo "== GlitchTip: $GLITCHTIP =="
H=$(fetch "http://$GLITCHTIP/")
LOC=$(header_of "$H" location)
[[ "$LOC" == "https://$GLITCHTIP"* ]] && pass "http->https redirect" || fail "http->https redirect expected, got $(status_of "$H") ${LOC:+-> $LOC}"
for path in / /login; do
	H=$(fetch "https://$GLITCHTIP$path")
	S=$(status_of "$H")
	[[ "$S" == 200 ]] && pass "GET $path 200" || fail "GET $path expected 200, got $S"
	expect_header "$H" x-frame-options DENY "glitchtip $path"
	expect_header "$H" x-content-type-options nosniff "glitchtip $path"
	expect_header "$H" strict-transport-security max-age= "glitchtip $path (issue 01M5A7AYSP4BYF7T63NA98ERQJ)"
done
SETTINGS=$(curl -sS --max-time 15 "https://$GLITCHTIP/api/settings/" 2>/dev/null)
for flag in enableUserRegistration enableOrganizationCreation; do
	grep -Eq "\"$flag\" *: *false" <<<"$SETTINGS" && pass "/api/settings/ $flag false" || fail "/api/settings/ $flag not false (or unreadable)"
done

echo "== Coolify: $COOLIFY (known finding: /login is public; status and headers only) =="
H=$(fetch "https://$COOLIFY/login")
info "GET /login -> $(status_of "$H")"
grep -E "^(strict-transport-security|x-frame-options|content-security-policy|x-content-type-options):" <<<"$H" | sed 's/^/INFO  /'

if [[ $PORTS == 1 ]]; then
	echo "== TCP connect-and-close (no bytes sent): $HOST =="
	for fam in 4 6; do
		ADDR=$(getent ahosts"$([[ $fam == 4 ]] && echo v4 || echo v6)" "$HOST" | awk 'NR==1{print $1}')
		[[ -z "$ADDR" ]] && { info "no IPv$fam address for $HOST"; continue; }
		for p in 22 80 443 3000 5432 6001 6002 8000; do
			if timeout 3 bash -c "exec 3<>/dev/tcp/$ADDR/$p" 2>/dev/null; then st=open; else st=filtered; fi
			case "$p" in 22|80|443) want=open ;; *) want=filtered ;; esac
			[[ $st == "$want" ]] && pass "IPv$fam $ADDR:$p $st" || fail "IPv$fam $ADDR:$p $st, expected $want"
		done
	done
fi

echo "== $FAILS failure(s) =="
exit "$FAILS"
