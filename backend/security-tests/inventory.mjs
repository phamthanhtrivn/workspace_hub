import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, serviceRequire } from './support.mjs';
import { CALLER_CREDENTIALS } from '../scripts/local-security/contract.mjs';

const ts = serviceRequire('project-service')('typescript');
const verbs = new Set(['Get', 'Post', 'Put', 'Patch', 'Delete', 'Head', 'Options', 'All']);
function files(directory, extension) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path, extension) : entry.name.endsWith(extension) && !entry.name.includes('.spec.') && !entry.name.endsWith('.d.ts') ? [path] : [];
  });
}
function decorators(node, source) {
  return (ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : []).map(({ expression }) => {
    const called = ts.isCallExpression(expression);
    return { name: (called ? expression.expression : expression).getText(source),
      argument: called && expression.arguments[0] ? expression.arguments[0].getText(source) : "''" };
  });
}
const literal = (expression) => /^(['"])(.*)\1$/.exec(expression)?.[2] ?? `{${expression}}`;
function auth(declared) {
  if (declared.some((entry) => entry.name === 'IndependentAuthentication')) return 'independent';
  if (declared.some((entry) => ['Public', 'PublicHttp'].includes(entry.name))) return 'public';
  if (declared.some((entry) => entry.name === 'OptionalIdentity')) return 'optional';
  if (declared.some((entry) => entry.name === 'UseGuards')) return 'explicit-guard';
  return 'service-default';
}

export function inventory() {
  const result = { http: [], kafka: [], sockets: [], callerEdges: CALLER_CREDENTIALS };
  for (const service of ['project-service', 'communication-service', 'document-service', 'calendar-service', 'notification-service', 'ai-service/api']) {
    for (const file of files(resolve(root, `backend/${service}/src`), '.ts')) {
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      ts.forEachChild(source, (node) => {
        if (!ts.isClassDeclaration(node)) return;
        const declared = decorators(node, source), controller = declared.find((entry) => entry.name === 'Controller');
        for (const member of node.members) {
          if (!ts.isMethodDeclaration(member)) continue;
          const method = decorators(member, source);
          const at = { service, file: relative(root, file).replaceAll('\\', '/'), line: source.getLineAndCharacterOfPosition(member.getStart(source)).line + 1,
            handler: `${node.name?.text}.${member.name.getText(source)}` };
          for (const entry of method) {
            if (controller && verbs.has(entry.name)) result.http.push({ ...at, verb: entry.name.toUpperCase(),
              path: `/${[literal(controller.argument), literal(entry.argument)].filter(Boolean).join('/')}`,
              authenticationDeclaration: auth([...method, ...declared]) });
            if (entry.name === 'EventPattern') result.kafka.push({ ...at, topicExpression: entry.argument });
            if (entry.name === 'SubscribeMessage') result.sockets.push({ ...at, eventExpression: entry.argument });
          }
        }
      });
    }
  }
  const directory = resolve(root, 'backend/user-service/src/main/java/vn/workspacehub/user/controller');
  const filter = readFileSync(resolve(root, 'backend/user-service/src/main/java/vn/workspacehub/user/config/JwtIdentityFilter.java'), 'utf8');
  const publicPaths = new Set([...(/PUBLIC_AUTH_PATHS = Set\.of\(([\s\S]*?)\);/.exec(filter)?.[1] ?? '').matchAll(/"([^"]+)"/g)].map((match) => match[1]));
  for (const file of files(directory, '.java')) {
    const source = readFileSync(file, 'utf8');
    const prefix = /@RequestMapping\(([^\n]+)\)/.exec(source)?.[1] ?? '""';
    for (const match of source.matchAll(/@(Get|Post|Put|Patch|Delete|Head|Options)Mapping(?:\(([^\n]*)\))?/g)) {
      const path = (literal(prefix) + literal(match[2] ?? '""')).replaceAll('//', '/');
      const verb = match[1].toUpperCase();
      result.http.push({ service: 'user-service', file: relative(root, file).replaceAll('\\', '/'), line: source.slice(0, match.index).split('\n').length,
        verb, path, authenticationDeclaration: (verb === 'POST' && publicPaths.has(path)) || (verb === 'GET' && ['/health', '/ready'].includes(path)) ? 'public-filter-allowlist' : path.includes('/internal/') ? 'internal-filter' : 'jwt-filter' });
    }
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = inventory();
  console.log(JSON.stringify(process.argv.includes('--json') ? result : {
    httpRoutes: result.http.length, kafkaHandlers: result.kafka.length, socketHandlers: result.sockets.length,
    callerEdges: result.callerEdges.length,
    httpByService: Object.fromEntries([...new Set(result.http.map((row) => row.service))].map((service) => [service, result.http.filter((row) => row.service === service).length])),
    note: 'Static declarations only; expressions in braces need manual resolution. Authentication modes require the service guard/filter and business authorization too.',
  }, null, 2));
}
