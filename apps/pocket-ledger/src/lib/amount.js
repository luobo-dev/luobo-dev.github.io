function normalizeExpression(input) {
  return String(input ?? '')
    .replace(/[，,]/g, '')
    .replace(/[＋]/g, '+')
    .replace(/[－−]/g, '-')
    .replace(/[×xX]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/\s+/g, '')
}

function tokenize(expression) {
  if (!expression) throw new Error('请输入金额')
  if (!/^[\d.+\-*/]+$/.test(expression)) throw new Error('算式中包含无法识别的字符')

  const tokens = expression.match(/(?:\d+(?:\.\d*)?|\.\d+|[+\-*/])/g) || []
  if (tokens.join('') !== expression) throw new Error('请检查金额算式')
  return tokens
}

export function evaluateAmountExpression(input) {
  const tokens = tokenize(normalizeExpression(input))
  let index = 0

  function parseFactor() {
    const token = tokens[index]
    if (token === '+' || token === '-') {
      index += 1
      const value = parseFactor()
      return token === '-' ? -value : value
    }
    if (!token || !/^\d*\.?\d+$/.test(token)) throw new Error('请检查金额算式')
    index += 1
    return Number(token)
  }

  function parseTerm() {
    let value = parseFactor()
    while (tokens[index] === '*' || tokens[index] === '/') {
      const operator = tokens[index]
      index += 1
      const right = parseFactor()
      if (operator === '/' && right === 0) throw new Error('金额不能除以 0')
      value = operator === '*' ? value * right : value / right
    }
    return value
  }

  function parseExpression() {
    let value = parseTerm()
    while (tokens[index] === '+' || tokens[index] === '-') {
      const operator = tokens[index]
      index += 1
      const right = parseTerm()
      value = operator === '+' ? value + right : value - right
    }
    return value
  }

  const result = parseExpression()
  if (index !== tokens.length || !Number.isFinite(result)) throw new Error('请检查金额算式')
  return Math.round((result + Number.EPSILON) * 100) / 100
}
