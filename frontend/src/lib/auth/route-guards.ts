import type { PermissionKey } from '$shared/enums';
import type { User } from '$shared/schemas/auth';
import { can, canForProject } from './permissions';

const routePermissionRules: Array<[RegExp, PermissionKey]> = [
  [/^\/assets\/create\/?$/, 'asset:create'],
  [/^\/assets\/[^/]+\/edit\/?$/, 'asset:update'],
  [/^\/opd\/?$/, 'opd:read'],
  [/^\/projects\/create\/?$/, 'project:create'],
  [/^\/projects\/[^/]+\/edit\/?$/, 'project:update'],
  [/^\/projects\/[^/]+\/documents\/?$/, 'project:document_read'],
  [/^\/projects\/[^/]+\/payments\/?$/, 'project:payment_read'],
  [/^\/projects\/[^/]+\/milestones\/?$/, 'project:read'],
  [/^\/projects\/[^/]+\/assets\/?$/, 'project:read'],
  [/^\/projects(?:\/[^/]+)?\/?$/, 'project:read'],
  [/^\/assets(?:\/[^/]+)?(?:\/history)?\/?$/, 'asset:read'],
  // PRD v1.4 §8.1: Dashboard adalah project-centric — guard pakai project:read
  // bukan asset:read, agar role dengan project:read (mis. Viewer) dapat akses
  // halaman post-login meskipun tidak punya asset:read. (Claude Code review C3)
  [/^\/dashboard\/?$/, 'project:read'],
  // Phase 5: Report presets
  [/^\/reports\/presets\/?$/, 'report:preset_manage'],
  [/^\/profile\/preferences\/?$/, 'prefs:read'],
  [/^\/profile(?:\/backup-codes|\/sessions)?\/?$/, 'user:read'],
  [/^\/tools\/?$/, 'asset:read'],
  [/^\/audit\/?$/, 'audit:read']
];

export function requiredPermissionForPath(pathname: string): PermissionKey | null {
  return routePermissionRules.find(([pattern]) => pattern.test(pathname))?.[1] ?? null;
}

export function canAccessPath(user: User | null | undefined, pathname: string): boolean {
  const projectDocuments = pathname.match(/^\/projects\/([^/]+)\/documents\/?$/);
  if (projectDocuments) return canForProject(user, 'project:document_read', projectDocuments[1]);
  const permission = requiredPermissionForPath(pathname);
  return !permission || can(user, permission);
}
