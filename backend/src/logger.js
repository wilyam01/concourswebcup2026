export function logEvent(level, event, fields = {}) {
  const entry = { timestamp: new Date().toISOString(), level, event, ...fields };
  const output = `${JSON.stringify(entry)}\n`;
  if (level === 'error' || level === 'warn') process.stderr.write(output);
  else process.stdout.write(output);
}
