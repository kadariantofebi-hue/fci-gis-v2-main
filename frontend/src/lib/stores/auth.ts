import { browser } from '$app/environment'; import { writable, derived } from 'svelte/store'; import type { Session, User } from '$shared/schemas/auth'; import type { RoleName } from '$shared/enums'; import { sessionForRole } from '$lib/services/api/auth';
const KEY='simanta.mock.session';
function initial(): Session | null { if(!browser) return null; const raw=localStorage.getItem(KEY); return raw?JSON.parse(raw):null; }
export const session = writable<Session | null>(initial());
export const currentUser = derived(session, ($s)=>$s?.user ?? null);
session.subscribe((value)=>{ if(browser){ if(value) localStorage.setItem(KEY, JSON.stringify(value)); else localStorage.removeItem(KEY); }});
export function setSession(value: Session) { session.set(value); }
export function logout() { session.set(null); }
export function switchRole(role: RoleName) { session.set(sessionForRole(role)); }
export const roles: RoleName[] = ['Super Admin','Admin','OPD Admin','Editor','Viewer','Auditor'];
