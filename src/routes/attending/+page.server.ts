import { resolve } from '$app/paths';
import { redirect, type ServerLoadEvent } from '@sveltejs/kit';

export const load = async ({ locals }: ServerLoadEvent) => {
  if (!locals.user) {
    redirect(307, resolve("/sign-in"))
  }
};
