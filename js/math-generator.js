/**
 * Math Generator & Evaluator Module
 * Strictly enforces 1-digit mathematics (0 - 9 result only)
 * Examples: 1 + 1, 2 - 1, 3 + 0, 5 + 4, 9 - 9, 8 - 3
 */

const MathGenerator = {
  /**
   * Generates a valid 1-digit math formula and its single-digit answer
   * @returns {{ formula: string, num1: number, op: string, num2: number, answer: number }}
   */
  generateOneDigitProblem() {
    const isAddition = Math.random() < 0.55;

    if (isAddition) {
      // a + b <= 9
      const answer = Math.floor(Math.random() * 10); // 0 to 9
      const num1 = Math.floor(Math.random() * (answer + 1));
      const num2 = answer - num1;
      return {
        formula: `${num1} + ${num2}`,
        num1,
        op: '+',
        num2,
        answer
      };
    } else {
      // a - b >= 0 where a, b in 0..9 and answer in 0..9
      const num1 = Math.floor(Math.random() * 10); // 0 to 9
      const num2 = Math.floor(Math.random() * (num1 + 1));
      const answer = num1 - num2;
      return {
        formula: `${num1} - ${num2}`,
        num1,
        op: '-',
        num2,
        answer
      };
    }
  },

  /**
   * Validates if a custom formula yields a single-digit answer (0-9)
   * @param {string} formulaStr e.g. "4 + 3" or "7-2"
   * @returns {{ valid: boolean, answer?: number, error?: string }}
   */
  validateFormula(formulaStr) {
    if (!formulaStr || typeof formulaStr !== 'string') {
      return { valid: false, error: 'กรุณากรอกสูตรคำนวณ' };
    }

    const cleaned = formulaStr.replace(/\s+/g, '');
    const match = cleaned.match(/^([0-9])([\+\-])([0-9])$/);
    if (!match) {
      return { valid: false, error: 'โจทย์ต้องเป็นเลข 1 หลักเท่านั้น เช่น 2+3 หรือ 5-1' };
    }

    const n1 = parseInt(match[1], 10);
    const op = match[2];
    const n2 = parseInt(match[3], 10);
    let ans = 0;

    if (op === '+') {
      ans = n1 + n2;
    } else if (op === '-') {
      ans = n1 - n2;
    }

    if (ans < 0 || ans > 9) {
      return { valid: false, error: `ผลลัพธ์ (${ans}) ต้องเป็นเลข 1 หลัก (0 ถึง 9) เท่านั้น` };
    }

    return { valid: true, answer: ans, num1: n1, op, num2: n2 };
  },

  /**
   * Renders colored HTML for a math formula according to exact requested colors:
   * 1: Light green, 2: Green, 3: Dark green
   * 4: Light pink, 5: Pink, 6: Dark pink
   * 7: Light purple, 8: Purple, 9: Dark purple
   * 0: Cyan tone
   * -: Maroon blood tone, +: Yellow-green tone
   */
  renderFormulaHTML(formulaStr) {
    const chars = formulaStr.split('');
    return chars.map(c => {
      if (c === ' ') return '<span class="note-space">&nbsp;</span>';
      if (c >= '0' && c <= '9') {
        return `<span class="note-char char-d${c}">${c}</span>`;
      }
      if (c === '-') {
        return `<span class="note-char char-op-minus">-</span>`;
      }
      if (c === '+') {
        return `<span class="note-char char-op-plus">+</span>`;
      }
      return `<span class="note-char">${c}</span>`;
    }).join('');
  }
};

window.MathGenerator = MathGenerator;
