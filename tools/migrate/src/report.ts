interface CountRow {
	table: string;
	source: number;
	migrated: number;
}

export class Report {
	private counts: CountRow[] = [];
	private warnings: string[] = [];
	private notes: string[] = [];

	count(table: string, source: number, migrated: number): void {
		this.counts.push({ table, source, migrated });
	}

	warn(message: string): void {
		this.warnings.push(message);
	}

	/** Informational — something worth knowing that is not a problem. */
	note(message: string): void {
		this.notes.push(message);
	}

	print(): void {
		console.log('\n─── Migration report ───────────────────────────');
		const width = Math.max(...this.counts.map((c) => c.table.length), 5);
		console.log(`${'table'.padEnd(width)}  source  migrated`);
		for (const c of this.counts) {
			const flag = c.source !== c.migrated ? '  ⚠' : '';
			console.log(
				`${c.table.padEnd(width)}  ${String(c.source).padStart(6)}  ${String(c.migrated).padStart(8)}${flag}`
			);
		}
		if (this.notes.length > 0) {
			console.log('');
			for (const n of this.notes) console.log(`  ℹ ${n}`);
		}
		if (this.warnings.length > 0) {
			console.log(`\n${this.warnings.length} warning(s):`);
			for (const w of this.warnings) console.log(`  ⚠ ${w}`);
		} else {
			console.log('\nNo warnings.');
		}
		console.log('────────────────────────────────────────────────');
	}
}
