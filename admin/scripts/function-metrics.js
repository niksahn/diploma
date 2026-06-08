import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const srcDir = path.join(projectRoot, "src");
const reportsDir = path.join(projectRoot, "reports");

const sourceExtensions = new Set([".ts", ".tsx"]);

/**
 * @typedef {Object} FunctionMetric
 * @property {number} index
 * @property {string} name
 * @property {string} kind
 * @property {string} location
 * @property {number} paramsCount
 * @property {boolean} hasReturnType
 * @property {number} bodyLines
 * @property {number} cyclomaticComplexity
 * @property {number} statementsCount
 * @property {number} maxNestingDepth
 */

/**
 * @param {string} dir
 * @returns {string[]}
 */
function collectSourceFiles(dir) {
  /** @type {string[]} */
  const result = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectSourceFiles(fullPath));
      continue;
    }

    const ext = path.extname(entry.name);
    if (!sourceExtensions.has(ext) || entry.name.endsWith(".d.ts")) {
      continue;
    }
    result.push(fullPath);
  }

  return result;
}

/**
 * @param {ts.Node} node
 * @returns {boolean}
 */
function isFunctionLikeNode(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

/**
 * @param {ts.FunctionLikeDeclarationBase} node
 * @returns {string}
 */
function getFunctionKind(node) {
  if (ts.isFunctionDeclaration(node)) return "function declaration";
  if (ts.isArrowFunction(node)) return "arrow function";
  if (ts.isFunctionExpression(node)) return "function expression";
  if (ts.isMethodDeclaration(node)) return "method declaration";
  if (ts.isConstructorDeclaration(node)) return "constructor";
  if (ts.isGetAccessorDeclaration(node)) return "get accessor";
  if (ts.isSetAccessorDeclaration(node)) return "set accessor";
  return "unknown";
}

/**
 * @param {ts.FunctionLikeDeclarationBase} node
 * @returns {string}
 */
function getFunctionName(node) {
  if ("name" in node && node.name) {
    if (ts.isIdentifier(node.name)) return node.name.text;
    return node.name.getText();
  }

  const parent = node.parent;
  if (parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  if (parent && ts.isPropertyAssignment(parent)) {
    return parent.name.getText();
  }
  if (parent && ts.isBinaryExpression(parent)) {
    return parent.left.getText();
  }
  return "<anonymous>";
}

/**
 * @param {ts.FunctionLikeDeclarationBase} fn
 * @param {ts.SourceFile} sourceFile
 * @returns {number}
 */
function getBodyLines(fn, sourceFile) {
  if (!fn.body) return 0;
  const bodyStart = sourceFile.getLineAndCharacterOfPosition(fn.body.getStart(sourceFile)).line + 1;
  const bodyEnd = sourceFile.getLineAndCharacterOfPosition(fn.body.getEnd()).line + 1;
  return Math.max(1, bodyEnd - bodyStart + 1);
}

/**
 * @param {ts.Node} node
 * @returns {boolean}
 */
function isNestingNode(node) {
  return (
    ts.isIfStatement(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isDoStatement(node) ||
    ts.isSwitchStatement(node) ||
    ts.isCatchClause(node) ||
    ts.isConditionalExpression(node)
  );
}

/**
 * @param {ts.FunctionLikeDeclarationBase} fn
 * @returns {{ cyclomaticComplexity: number, statementsCount: number, maxNestingDepth: number }}
 */
function analyzeBody(fn) {
  if (!fn.body) {
    return { cyclomaticComplexity: 1, statementsCount: 0, maxNestingDepth: 0 };
  }

  let cyclomaticComplexity = 1;
  let statementsCount = 0;
  let maxNestingDepth = 0;

  /**
   * @param {ts.Node} node
   * @param {number} depth
   */
  function walk(node, depth) {
    if (node !== fn && isFunctionLikeNode(node)) {
      return;
    }

    if (ts.isStatement(node) && !ts.isBlock(node)) {
      statementsCount += 1;
    }

    if (
      ts.isIfStatement(node) ||
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node) ||
      ts.isCatchClause(node) ||
      ts.isConditionalExpression(node)
    ) {
      cyclomaticComplexity += 1;
    }

    if (ts.isCaseClause(node)) {
      cyclomaticComplexity += 1;
    }

    if (
      ts.isBinaryExpression(node) &&
      (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
        node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
        node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
    ) {
      cyclomaticComplexity += 1;
    }

    const nextDepth = isNestingNode(node) ? depth + 1 : depth;
    if (nextDepth > maxNestingDepth) {
      maxNestingDepth = nextDepth;
    }

    node.forEachChild((child) => walk(child, nextDepth));
  }

  walk(fn.body, 0);

  return { cyclomaticComplexity, statementsCount, maxNestingDepth };
}

/**
 * @param {FunctionMetric[]} metrics
 */
function writeReports(metrics) {
  fs.mkdirSync(reportsDir, { recursive: true });

  const jsonPath = path.join(reportsDir, "function-metrics.json");
  fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2), "utf-8");

  const csvHeader = [
    "index",
    "name",
    "kind",
    "location",
    "paramsCount",
    "hasReturnType",
    "bodyLines",
    "cyclomaticComplexity",
    "statementsCount",
    "maxNestingDepth",
  ];

  const csvRows = metrics.map((m) =>
    [
      m.index,
      JSON.stringify(m.name),
      JSON.stringify(m.kind),
      JSON.stringify(m.location),
      m.paramsCount,
      m.hasReturnType,
      m.bodyLines,
      m.cyclomaticComplexity,
      m.statementsCount,
      m.maxNestingDepth,
    ].join(",")
  );

  const csvPath = path.join(reportsDir, "function-metrics.csv");
  fs.writeFileSync(csvPath, [csvHeader.join(","), ...csvRows].join("\n"), "utf-8");

  console.log(`Saved ${metrics.length} functions:`);
  console.log(`- ${path.relative(projectRoot, jsonPath)}`);
  console.log(`- ${path.relative(projectRoot, csvPath)}`);
}

function main() {
  const files = collectSourceFiles(srcDir);
  /** @type {FunctionMetric[]} */
  const metrics = [];

  for (const filePath of files) {
    const sourceText = fs.readFileSync(filePath, "utf-8");
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);

    /**
     * @param {ts.Node} node
     */
    function visit(node) {
      if (isFunctionLikeNode(node)) {
        const fn = /** @type {ts.FunctionLikeDeclarationBase} */ (node);
        const kind = getFunctionKind(fn);
        const name = getFunctionName(fn);
        const pos = sourceFile.getLineAndCharacterOfPosition(fn.getStart(sourceFile));
        const relativePath = path.relative(srcDir, filePath).replaceAll("\\", "/");
        const location = `${relativePath}:${pos.line + 1}:${pos.character + 1}`;
        const bodyLines = getBodyLines(fn, sourceFile);
        const { cyclomaticComplexity, statementsCount, maxNestingDepth } = analyzeBody(fn);

        metrics.push({
          index: metrics.length,
          name,
          kind,
          location,
          paramsCount: fn.parameters.length,
          hasReturnType: Boolean(fn.type),
          bodyLines,
          cyclomaticComplexity,
          statementsCount,
          maxNestingDepth,
        });
      }
      node.forEachChild(visit);
    }

    visit(sourceFile);
  }

  writeReports(metrics);
}

main();

