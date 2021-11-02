/*
Helper/internal functions
*/

function isValidTtlPrefix(prefix) {
  return /^(PREFIX\s+\w*:\s*<[^>]*>|@prefix\s+\w*:\s*<[^>]*>\s*\.)$/i.test(
    prefix.trim()
  );
}

function parseTtlPrefix(prefix) {
  const matches = prefix
    .trim()
    .match(
      /^(PREFIX\s+(\w*:)\s*<([^>]*)>|@prefix\s+(\w*:)\s*<([^>]*)>\s*\.)$/i
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

/*
Exported functions
*/

export function applyPrefixesToStatement(statement, prefixes) {
  if (typeof statement !== "string") return statement;
  let shortenedStatement = statement;
  for (const prefix of prefixes) {
    if (shortenedStatement === prefix.uri) continue;

    shortenedStatement = shortenedStatement.replaceAll(
      prefix.uri,
      prefix.prefix
    );
  }

  return shortenedStatement;
}

export function resolvePrefixesInStatement(statement, prefixes) {
  if (typeof statement !== "string") return statement;
  let resolvedStatement = statement;
  for (const prefix of prefixes) {
    resolvedStatement = resolvedStatement.replaceAll(prefix.prefix, prefix.uri);
  }

  return resolvedStatement;
}

export function validateRDFPrefixes(prefixes) {
  if (prefixes.length === 0) return true;

  const prefixArr = prefixes.split("\n");
  return prefixArr.every((prefix) => isValidTtlPrefix(prefix));
}

export function parseTtlPrefixes(prefixes) {
  if (prefixes.length === 0) return [];

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

export function getNumberOfLinks(node, links) {
  return {
    ...node,
    linkCount: links.reduce(
      (prev, cur) =>
        cur.source === node.id || cur.target === node.id ? prev + 1 : prev,
      0
    ),
  };
}

export function convertSparqlResultsToD3Graph({
  sparqlResults,
  prefixes,
  maxTextLength,
  margin,
  padding,
  nodeRadiusFactor,
  whitelist,
  nodeCapacity,
}) {
  let nodes = [];
  let links = [];

  let uniqueId = 0;
  for (const { subject, predicate, object } of sparqlResults) {
    if (
      whitelist.includes(subject.value) ||
      whitelist.includes(predicate.value) ||
      whitelist.includes(object.value) ||
      whitelist.length === 0
    ) {
      nodes.push(
        {
          id: subject.value,
          rdfsLabel:
            predicate.value === "http://www.w3.org/2000/01/rdf-schema#label"
              ? object.value
              : undefined,
          rdfValue: applyPrefixesToStatement(subject.value, prefixes),
          rdfType: subject.type,
          radius:
            Math.min(
              applyPrefixesToStatement(subject.value, prefixes).length,
              maxTextLength
            ) *
              nodeRadiusFactor +
            padding +
            margin,
        },
        {
          id: predicate.value,
          rdfValue: applyPrefixesToStatement(predicate.value, prefixes),
          rdfType: predicate.type,
          radius:
            Math.min(
              applyPrefixesToStatement(predicate.value, prefixes).length,
              maxTextLength
            ) *
              nodeRadiusFactor +
            padding +
            margin,
        },
        {
          id:
            object.type === "literal"
              ? object.value + ++uniqueId
              : object.value,
          rdfValue: applyPrefixesToStatement(object.value, prefixes),
          rdfType: object.type,
          radius:
            Math.min(
              applyPrefixesToStatement(object.value, prefixes).length,
              maxTextLength
            ) *
              nodeRadiusFactor +
            padding +
            margin,
        }
      );
      links.push(
        {
          source: subject.value,
          target: predicate.value,
        },
        {
          source: predicate.value,
          target:
            object.type === "literal" ? object.value + uniqueId : object.value,
        }
      );
    }
  }

  // only leave unique nodes
  nodes = [...new Map(nodes.map((o) => [o.id, o])).values()];

  // limit number of nodes
  nodes = nodes.slice(0, nodeCapacity);

  // filter out links that are now no longer connected
  links = links.filter(
    (link) =>
      nodes.find((node) => link.source === node.id) != null &&
      nodes.find((node) => link.target === node.id) != null
  );

  // filter out duplicate links
  links = links.filter(
    (link, i) => 
      links.slice(i + 1).find(otherLink => link.source === otherLink.source && link.target === otherLink.target) == null
  )

  // add counter to nodes for all links
  nodes = nodes.map((node) => getNumberOfLinks(node, links));

  return {
    nodes,
    links,
  };
}
