/*
Helper/internal functions
*/

function isValidTtlPrefix(prefix) {
  return /^(PREFIX\s+\w*:\s*<[^>]*>|\@prefix\s+\w*:\s*<[^>]*>\s*\.)$/i.test(
    prefix.trim()
  );
}

function parseTtlPrefix(prefix) {
  const matches = prefix
    .trim()
    .match(
      /^(PREFIX\s+(\w*:)\s*<([^>]*)>|\@prefix\s+(\w*:)\s*<([^>]*)>\s*\.)$/i
    );

  return matches[2] && matches[3]
    ? {
        prefix: matches[2],
        uri: matches[3],
      }
    : {
        prefix: matches[4],
        uri: matches[5],
      };
}

export function applyPrefixesToStatement(statement, prefixes) {
  if (typeof statement !== "string") return statement;
  let shortenedStatement = statement;
  for (const prefix of prefixes) {
    shortenedStatement = shortenedStatement.replaceAll(prefix.uri, prefix.prefix);
  }

  return shortenedStatement;
}

window.applyPrefixesToStatement = applyPrefixesToStatement;

/*
Exported functions
*/

export function validateRDFPrefixes(prefixes) {
  const prefixArr = prefixes.split("\n");
  return prefixArr.every((prefix) => isValidTtlPrefix(prefix));
}

export function parseTtlPrefixes(prefixes) {
  const prefixArr = prefixes.split("\n");
  return prefixArr.map((prefix) => parseTtlPrefix(prefix));
}

export function stringifyTtlPrefixes(prefixes) {
  let prefixString = "";
  for (const prefix of prefixes) {
    prefixString += `PREFIX ${prefix.prefix} <${prefix.uri}>\n`;
  }

  return prefixString;
}
