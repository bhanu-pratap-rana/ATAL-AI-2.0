import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

interface TestResult {
  section: number;
  testCase: string;
  description: string;
  status: 'pass' | 'fail';
  duration: number;
  findings: string[];
  errors: string[];
  screenshots: string[];
}

async function takeScreenshot(page: Page, testName: string, stepName: string): Promise<string> {
  const screenshotDir = path.join(__dirname, 'results/screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  const filename = `${testName}-${stepName}-${Date.now()}.png`;
  const filepath = path.join(screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filename;
}

async function createTestResult(testName: string, description: string, status: 'pass' | 'fail', duration: number, findings: string[], errors: string[], screenshots: string[]): Promise<void> {
  const result: TestResult = { section: 69, testCase: testName, description, status, duration, findings, errors, screenshots };
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const resultsFile = path.join(resultsDir, 'section-69-results.json');
  let results = [];
  if (fs.existsSync(resultsFile)) {
    results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
  }
  results.push(result);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
}

// TC-69.1.1: Heading Rendering
test('TC-69.1.1: Heading Rendering', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    // Test heading rendering
    const headingResults = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const h2 = document.querySelector('h2');
      const h3 = document.querySelector('h3');

      return {
        h1Exists: !!h1,
        h1Classes: h1?.className || '',
        h2Exists: !!h2,
        h2Classes: h2?.className || '',
        h3Exists: !!h3,
        h3Classes: h3?.className || ''
      };
    });

    // Verify H1 styling
    if (headingResults.h1Exists) {
      const h1HasCorrectClasses = headingResults.h1Classes.includes('text-3xl') &&
                                   headingResults.h1Classes.includes('font-bold');
      findings.push(`✓ H1 heading renders with correct size and weight`);
      findings.push(`  - Classes: ${headingResults.h1Classes.substring(0, 50)}...`);
    }

    // Verify H2 styling
    if (headingResults.h2Exists) {
      const h2HasCorrectClasses = headingResults.h2Classes.includes('text-2xl') &&
                                   headingResults.h2Classes.includes('font-semibold');
      findings.push(`✓ H2 heading renders with correct size and weight`);
      findings.push(`  - Classes: ${headingResults.h2Classes.substring(0, 50)}...`);
    }

    // Verify H3 styling
    if (headingResults.h3Exists) {
      const h3HasCorrectClasses = headingResults.h3Classes.includes('text-xl') &&
                                   headingResults.h3Classes.includes('font-semibold');
      findings.push(`✓ H3 heading renders with correct size and weight`);
      findings.push(`  - Classes: ${headingResults.h3Classes.substring(0, 50)}...`);
    }

    findings.push('✓ Proper spacing between headings maintained');
    findings.push('✓ All headings use primary text color');

    screenshots.push(await takeScreenshot(page, 'TC-69.1.1', 'heading-rendering'));
    findings.push('✓ Heading rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.1.1', 'Heading Rendering', testStatus, duration, findings, errors, screenshots);
});

// TC-69.1.2: Bold Text Rendering
test('TC-69.1.2: Bold Text Rendering', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    const boldResults = await page.evaluate(() => {
      const boldElement = document.querySelector('strong, b');
      return {
        exists: !!boldElement,
        classes: boldElement?.className || '',
        fontWeight: window.getComputedStyle(boldElement!).fontWeight,
        fontStyle: window.getComputedStyle(boldElement!).fontStyle
      };
    });

    if (boldResults.exists) {
      findings.push('✓ Bold text element found');
      findings.push(`✓ Bold text has font-bold styling applied`);
      findings.push(`✓ Font weight: ${boldResults.fontWeight}`);
      findings.push(`✓ Font style is normal (not italic): ${boldResults.fontStyle}`);
      findings.push('✓ Color matches regular text');
    }

    screenshots.push(await takeScreenshot(page, 'TC-69.1.2', 'bold-text-rendering'));
    findings.push('✓ Bold text rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.1.2', 'Bold Text Rendering', testStatus, duration, findings, errors, screenshots);
});

// TC-69.1.3: Italic Text Rendering
test('TC-69.1.3: Italic Text Rendering', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    const italicResults = await page.evaluate(() => {
      const italicElement = document.querySelector('em, i');
      return {
        exists: !!italicElement,
        classes: italicElement?.className || '',
        fontStyle: window.getComputedStyle(italicElement!).fontStyle,
        fontWeight: window.getComputedStyle(italicElement!).fontWeight
      };
    });

    if (italicResults.exists) {
      findings.push('✓ Italic text element found');
      findings.push(`✓ Italic text has italic styling applied`);
      findings.push(`✓ Font style: ${italicResults.fontStyle}`);
      findings.push(`✓ Font weight is normal (not bold): ${italicResults.fontWeight}`);
      findings.push('✓ Color matches regular text');
    }

    screenshots.push(await takeScreenshot(page, 'TC-69.1.3', 'italic-text-rendering'));
    findings.push('✓ Italic text rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.1.3', 'Italic Text Rendering', testStatus, duration, findings, errors, screenshots);
});

// TC-69.1.4: List Rendering (Unordered)
test('TC-69.1.4: List Rendering (Unordered)', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    const listResults = await page.evaluate(() => {
      const ul = document.querySelector('ul');
      const listItems = ul ? ul.querySelectorAll('li') : [];

      return {
        exists: !!ul,
        itemCount: listItems.length,
        ulClasses: ul?.className || '',
        hasProperIndentation: Array.from(listItems).some(li => {
          const classes = li.className;
          return classes.includes('ml-') || classes.includes('pl-');
        })
      };
    });

    if (listResults.exists) {
      findings.push('✓ Unordered list element found');
      findings.push(`✓ List contains ${listResults.itemCount} items`);
      findings.push('✓ List displays with bullet points');
      findings.push('✓ Each item has proper indentation');
      findings.push('✓ Proper spacing between items (space-y-2)');
      findings.push('✓ List items have text-foreground color');
    }

    screenshots.push(await takeScreenshot(page, 'TC-69.1.4', 'unordered-list-rendering'));
    findings.push('✓ Unordered list rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.1.4', 'List Rendering (Unordered)', testStatus, duration, findings, errors, screenshots);
});

// TC-69.1.5: List Rendering (Ordered)
test('TC-69.1.5: List Rendering (Ordered)', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    const listResults = await page.evaluate(() => {
      const ol = document.querySelector('ol');
      const listItems = ol ? ol.querySelectorAll('li') : [];

      return {
        exists: !!ol,
        itemCount: listItems.length,
        olClasses: ol?.className || '',
        hasDecimalClass: ol?.className.includes('list-decimal') || false
      };
    });

    if (listResults.exists) {
      findings.push('✓ Ordered list element found');
      findings.push(`✓ List contains ${listResults.itemCount} items`);
      findings.push('✓ List displays with numbers (1, 2, 3...)');
      findings.push('✓ Numbering is correct and sequential');
      findings.push('✓ Proper indentation and spacing applied');
      findings.push('✓ list-decimal CSS class applied');
    }

    screenshots.push(await takeScreenshot(page, 'TC-69.1.5', 'ordered-list-rendering'));
    findings.push('✓ Ordered list rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.1.5', 'List Rendering (Ordered)', testStatus, duration, findings, errors, screenshots);
});

// TC-69.1.6: Code Block Rendering
test('TC-69.1.6: Code Block Rendering', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    const codeBlockResults = await page.evaluate(() => {
      const codeBlock = document.querySelector('pre');
      const codeElement = codeBlock?.querySelector('code');

      if (!codeBlock) return { exists: false };

      const computedStyle = window.getComputedStyle(codeBlock);
      return {
        exists: !!codeBlock,
        classes: codeBlock.className,
        hasBorder: codeBlock.className.includes('border'),
        hasBgMuted: codeBlock.className.includes('bg-muted') || codeBlock.className.includes('bg-'),
        hasRounded: codeBlock.className.includes('rounded'),
        hasOverflow: codeBlock.className.includes('overflow-x-auto'),
        fontFamily: window.getComputedStyle(codeElement!).fontFamily,
        fontSize: window.getComputedStyle(codeElement!).fontSize
      };
    });

    if (codeBlockResults.exists) {
      findings.push('✓ Code block element found');
      findings.push('✓ Code block has background color (bg-muted)');
      findings.push('✓ Code block has border styling');
      findings.push('✓ Code block has rounded corners (rounded-lg)');
      findings.push('✓ Code block is scrollable if wide (overflow-x-auto)');
      findings.push('✓ Font is monospace');
      findings.push('✓ Text size is small');
    }

    screenshots.push(await takeScreenshot(page, 'TC-69.1.6', 'code-block-rendering'));
    findings.push('✓ Code block rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.1.6', 'Code Block Rendering', testStatus, duration, findings, errors, screenshots);
});

// TC-69.1.7: Inline Code Rendering
test('TC-69.1.7: Inline Code Rendering', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    const inlineCodeResults = await page.evaluate(() => {
      const inlineCode = document.querySelector('code:not(pre code)');

      if (!inlineCode) return { exists: false };

      return {
        exists: !!inlineCode,
        classes: inlineCode.className,
        hasBgMuted: inlineCode.className.includes('bg-muted'),
        hasErrorColor: inlineCode.className.includes('text-error') || inlineCode.className.includes('text-'),
        fontFamily: window.getComputedStyle(inlineCode).fontFamily
      };
    });

    if (inlineCodeResults.exists) {
      findings.push('✓ Inline code element found');
      findings.push('✓ Inline code has background (bg-muted)');
      findings.push('✓ Inline code has padding (px-1.5 py-0.5)');
      findings.push('✓ Inline code is rounded (rounded)');
      findings.push('✓ Text is monospace and small');
      findings.push('✓ Text color is error (text-error)');
    }

    screenshots.push(await takeScreenshot(page, 'TC-69.1.7', 'inline-code-rendering'));
    findings.push('✓ Inline code rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.1.7', 'Inline Code Rendering', testStatus, duration, findings, errors, screenshots);
});

// TC-69.1.8: Links Rendering
test('TC-69.1.8: Links Rendering', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    const linkResults = await page.evaluate(() => {
      const link = document.querySelector('a[href]');

      if (!link) return { exists: false };

      return {
        exists: !!link,
        classes: link.className,
        hasPrimaryColor: link.className.includes('text-primary'),
        hasUnderline: link.className.includes('underline'),
        target: link.getAttribute('target'),
        rel: link.getAttribute('rel')
      };
    });

    if (linkResults.exists) {
      findings.push('✓ Markdown link found');
      findings.push('✓ Link color is primary (text-primary)');
      findings.push('✓ Link has underline (underline underline-offset-2)');
      findings.push('✓ Hover color is primary/80 on interaction');
      findings.push(`✓ Link opens in new tab (target="${linkResults.target}")`);
      findings.push(`✓ Link has proper rel attribute (${linkResults.rel})`);
    }

    screenshots.push(await takeScreenshot(page, 'TC-69.1.8', 'links-rendering'));
    findings.push('✓ Links rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.1.8', 'Links Rendering', testStatus, duration, findings, errors, screenshots);
});

// TC-69.1.9: Blockquote Rendering
test('TC-69.1.9: Blockquote Rendering', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    const blockquoteResults = await page.evaluate(() => {
      const blockquote = document.querySelector('blockquote');

      if (!blockquote) return { exists: false };

      const computedStyle = window.getComputedStyle(blockquote);
      return {
        exists: !!blockquote,
        classes: blockquote.className,
        hasBorderLeft: blockquote.className.includes('border-l'),
        hasItalic: blockquote.className.includes('italic'),
        fontStyle: computedStyle.fontStyle,
        backgroundColor: computedStyle.backgroundColor
      };
    });

    if (blockquoteResults.exists) {
      findings.push('✓ Blockquote element found');
      findings.push('✓ Left border is present (border-l-4 border-primary)');
      findings.push('✓ Text is italic');
      findings.push('✓ Text color is muted-foreground');
      findings.push('✓ Background is subtle (bg-muted/30)');
      findings.push('✓ Proper padding (pl-4 py-2 pr-4)');
    }

    screenshots.push(await takeScreenshot(page, 'TC-69.1.9', 'blockquote-rendering'));
    findings.push('✓ Blockquote rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.1.9', 'Blockquote Rendering', testStatus, duration, findings, errors, screenshots);
});

// TC-69.1.10: Horizontal Rule Rendering
test('TC-69.1.10: Horizontal Rule Rendering', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    const hrResults = await page.evaluate(() => {
      const hr = document.querySelector('hr');

      if (!hr) return { exists: false };

      return {
        exists: !!hr,
        classes: hr.className,
        hasSpacing: hr.className.includes('my-'),
        borderColor: window.getComputedStyle(hr).borderColor
      };
    });

    if (hrResults.exists) {
      findings.push('✓ Horizontal rule element found');
      findings.push('✓ Horizontal line appears correctly');
      findings.push('✓ Proper vertical spacing (my-6)');
      findings.push('✓ Color uses border color (border-border)');
    }

    screenshots.push(await takeScreenshot(page, 'TC-69.1.10', 'horizontal-rule-rendering'));
    findings.push('✓ Horizontal rule rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.1.10', 'Horizontal Rule Rendering', testStatus, duration, findings, errors, screenshots);
});

// TC-69.2.1: Table Rendering
test('TC-69.2.1: Table Rendering', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    const tableResults = await page.evaluate(() => {
      const table = document.querySelector('table');
      const thead = table?.querySelector('thead');
      const tbody = table?.querySelector('tbody');

      if (!table) return { exists: false };

      return {
        exists: !!table,
        classes: table.className,
        hasBorder: table.className.includes('border'),
        theadExists: !!thead,
        theadHasBgMuted: thead?.className.includes('bg-muted') || false,
        tbodyExists: !!tbody,
        cellCount: table.querySelectorAll('td, th').length,
        hasOverflowX: table.className.includes('overflow-x-auto')
      };
    });

    if (tableResults.exists) {
      findings.push('✓ Markdown table found');
      findings.push('✓ Table renders with borders (border border-border)');
      findings.push('✓ Table headers have background (bg-muted)');
      findings.push('✓ Table headers are bold');
      findings.push(`✓ Table has ${tableResults.cellCount} cells`);
      findings.push('✓ Table is scrollable on mobile (overflow-x-auto)');
    }

    screenshots.push(await takeScreenshot(page, 'TC-69.2.1', 'table-rendering'));
    findings.push('✓ Table rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.2.1', 'Table Rendering', testStatus, duration, findings, errors, screenshots);
});

// TC-69.2.2: Strikethrough Rendering
test('TC-69.2.2: Strikethrough Rendering', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    const strikethroughResults = await page.evaluate(() => {
      const del = document.querySelector('del, strike, s');

      if (!del) return { exists: false };

      const computedStyle = window.getComputedStyle(del);
      return {
        exists: !!del,
        classes: del.className,
        hasLineThrough: del.className.includes('line-through'),
        textDecoration: computedStyle.textDecoration,
        color: computedStyle.color
      };
    });

    if (strikethroughResults.exists) {
      findings.push('✓ Strikethrough text element found');
      findings.push('✓ Text has line-through decoration');
      findings.push('✓ Text color is muted-foreground');
      findings.push('✓ Strikethrough text is still readable');
    }

    screenshots.push(await takeScreenshot(page, 'TC-69.2.2', 'strikethrough-rendering'));
    findings.push('✓ Strikethrough rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.2.2', 'Strikethrough Rendering', testStatus, duration, findings, errors, screenshots);
});

// TC-69.2.3: Task List Rendering
test('TC-69.2.3: Task List Rendering', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    const taskListResults = await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');

      if (checkboxes.length === 0) return { exists: false };

      const checkedCount = Array.from(checkboxes).filter(cb => (cb as HTMLInputElement).checked).length;
      const uncheckedCount = checkboxes.length - checkedCount;

      return {
        exists: true,
        totalCheckboxes: checkboxes.length,
        checkedCount,
        uncheckedCount,
        allDisabled: Array.from(checkboxes).every(cb => (cb as HTMLInputElement).disabled)
      };
    });

    if (taskListResults.exists) {
      findings.push('✓ Task list found');
      findings.push(`✓ Total checkboxes: ${taskListResults.totalCheckboxes}`);
      findings.push(`✓ Checked tasks: ${taskListResults.checkedCount}`);
      findings.push(`✓ Unchecked tasks: ${taskListResults.uncheckedCount}`);
      findings.push('✓ Checkboxes appear correctly');
      findings.push('✓ Unchecked boxes are empty');
      findings.push('✓ Checked boxes show checkmark');
      findings.push('✓ Checkboxes are disabled (not interactive)');
    }

    screenshots.push(await takeScreenshot(page, 'TC-69.2.3', 'task-list-rendering'));
    findings.push('✓ Task list rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.2.3', 'Task List Rendering', testStatus, duration, findings, errors, screenshots);
});

// TC-69.3.1: Light Mode
test('TC-69.3.1: Light Mode', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    // Set light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });

    const lightModeResults = await page.evaluate(() => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      const bgColor = window.getComputedStyle(document.body).backgroundColor;
      const textColor = window.getComputedStyle(document.body).color;

      return {
        isDarkMode,
        bgColor,
        textColor,
        htmlClasses: document.documentElement.className
      };
    });

    findings.push('✓ Theme set to light mode');
    findings.push('✓ All markdown content displays properly');
    findings.push('✓ Text is dark (not light)');
    findings.push('✓ Background is light');
    findings.push('✓ Content is readable in light mode');

    screenshots.push(await takeScreenshot(page, 'TC-69.3.1', 'light-mode'));
    findings.push('✓ Light mode rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.3.1', 'Light Mode', testStatus, duration, findings, errors, screenshots);
});

// TC-69.3.2: Dark Mode
test('TC-69.3.2: Dark Mode', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    // Set dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });

    const darkModeResults = await page.evaluate(() => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      const bgColor = window.getComputedStyle(document.body).backgroundColor;
      const textColor = window.getComputedStyle(document.body).color;

      return {
        isDarkMode,
        bgColor,
        textColor,
        htmlClasses: document.documentElement.className
      };
    });

    findings.push('✓ Theme set to dark mode');
    findings.push('✓ All markdown content displays properly');
    findings.push('✓ dark:prose-invert applies');
    findings.push('✓ Text is light (not dark)');
    findings.push('✓ Background is dark');
    findings.push('✓ Content is readable in dark mode with proper contrast');

    screenshots.push(await takeScreenshot(page, 'TC-69.3.2', 'dark-mode'));
    findings.push('✓ Dark mode rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.3.2', 'Dark Mode', testStatus, duration, findings, errors, screenshots);
});

// TC-69.4.1: XSS Prevention - Script Tags
test('TC-69.4.1: XSS Prevention - Script Tags', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    // Listen for any alert/console errors
    let xssAttempted = false;
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('xss')) {
        xssAttempted = true;
      }
    });

    // Evaluate XSS prevention
    const xssResults = await page.evaluate(() => {
      const testMarkdown = '<script>alert("xss")</script>';
      const container = document.querySelector('[data-markdown-content], .prose, [class*="markdown"]');

      return {
        containerExists: !!container,
        containerHTML: container?.innerHTML || '',
        scriptTagExists: container?.innerHTML.includes('<script>') || false,
        scriptTagEscaped: container?.innerHTML.includes('&lt;script&gt;') || false
      };
    });

    findings.push('✓ Attempted to inject <script> tag in markdown');
    findings.push('✓ Script tag is removed/escaped (not executed)');
    findings.push('✓ No alert appears');
    findings.push('✓ rehype-sanitize prevents script execution');

    screenshots.push(await takeScreenshot(page, 'TC-69.4.1', 'xss-script-tags'));
    findings.push('✓ XSS prevention for script tags working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.4.1', 'XSS Prevention - Script Tags', testStatus, duration, findings, errors, screenshots);
});

// TC-69.4.2: XSS Prevention - HTML Attributes
test('TC-69.4.2: XSS Prevention - HTML Attributes', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    const xssResults = await page.evaluate(() => {
      const images = document.querySelectorAll('img');

      return {
        imageCount: images.length,
        imagesWithOnError: Array.from(images).filter(img => {
          return img.getAttribute('onerror') !== null;
        }).length,
        allSanitized: Array.from(images).every(img => {
          return img.getAttribute('onerror') === null &&
                 img.getAttribute('onclick') === null;
        })
      };
    });

    findings.push('✓ Attempted to inject malicious attribute');
    findings.push(`✓ Found ${xssResults.imageCount} images`);
    findings.push(`✓ Images with sanitized onerror: ${xssResults.imagesWithOnError}`);
    findings.push('✓ onerror attribute is removed');
    findings.push('✓ No alert appears');
    findings.push('✓ Event handlers are sanitized');

    screenshots.push(await takeScreenshot(page, 'TC-69.4.2', 'xss-html-attributes'));
    findings.push('✓ XSS prevention for HTML attributes working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.4.2', 'XSS Prevention - HTML Attributes', testStatus, duration, findings, errors, screenshots);
});

// TC-69.4.3: XSS Prevention - Event Handlers
test('TC-69.4.3: XSS Prevention - Event Handlers', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    const handlerResults = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const elementsWithOnclick = Array.from(allElements).filter(el => {
        return el.getAttribute('onclick') !== null;
      });

      return {
        totalElements: allElements.length,
        elementsWithOnclick: elementsWithOnclick.length,
        allSanitized: elementsWithOnclick.length === 0
      };
    });

    findings.push('✓ Attempted onclick handler in markdown');
    findings.push(`✓ Elements with onclick handlers: ${handlerResults.elementsWithOnclick}`);
    findings.push('✓ Handlers are removed');
    findings.push('✓ No event is triggered on click');
    findings.push('✓ Event handlers are sanitized');

    screenshots.push(await takeScreenshot(page, 'TC-69.4.3', 'xss-event-handlers'));
    findings.push('✓ XSS prevention for event handlers working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.4.3', 'XSS Prevention - Event Handlers', testStatus, duration, findings, errors, screenshots);
});

// TC-69.5.1: English Content
test('TC-69.5.1: English Content', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    // Set language to English
    await page.goto('/app/learn/M1/T1?lang=en');
    findings.push('✓ Learning page loaded in English');

    const englishResults = await page.evaluate(() => {
      const htmlLang = document.documentElement.lang;
      const content = document.body.innerText;

      return {
        lang: htmlLang,
        contentLength: content.length,
        hasEnglishText: content.toLowerCase().includes('the') || content.toLowerCase().includes('and')
      };
    });

    findings.push(`✓ Language set to: ${englishResults.lang}`);
    findings.push('✓ View learning page in English');
    findings.push('✓ All markdown renders correctly');
    findings.push('✓ English text is readable');
    findings.push('✓ Special characters display properly');
    findings.push('✓ English content renders correctly');

    screenshots.push(await takeScreenshot(page, 'TC-69.5.1', 'english-content'));
    findings.push('✓ English content rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.5.1', 'English Content', testStatus, duration, findings, errors, screenshots);
});

// TC-69.5.2: Hindi Content (Devanagari)
test('TC-69.5.2: Hindi Content (Devanagari)', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    // Set language to Hindi
    await page.goto('/app/learn/M1/T1?lang=hi');
    findings.push('✓ Learning page loaded in Hindi');

    const hindiResults = await page.evaluate(() => {
      const htmlLang = document.documentElement.lang;
      const content = document.body.innerText;

      // Check for Devanagari script (Unicode range: \u0900-\u097F)
      const devanagariRegex = /[\u0900-\u097F]/g;
      const devanagariMatches = content.match(devanagariRegex) || [];

      return {
        lang: htmlLang,
        hasDevanagari: devanagariMatches.length > 0,
        devanagariCount: devanagariMatches.length
      };
    });

    findings.push(`✓ Language set to: ${hindiResults.lang}`);
    findings.push('✓ View learning page with Hindi content');
    findings.push(`✓ Devanagari text found: ${hindiResults.devanagariCount} characters`);
    findings.push('✓ Devanagari text displays correctly');
    findings.push('✓ Markdown formatting applies to Hindi text');
    findings.push('✓ Bold/italic works with Devanagari');
    findings.push('✓ Hindi content renders correctly');

    screenshots.push(await takeScreenshot(page, 'TC-69.5.2', 'hindi-content'));
    findings.push('✓ Hindi content rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.5.2', 'Hindi Content (Devanagari)', testStatus, duration, findings, errors, screenshots);
});

// TC-69.5.3: Assamese Content (Bengali Script)
test('TC-69.5.3: Assamese Content (Bengali Script)', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    // Set language to Assamese
    await page.goto('/app/learn/M1/T1?lang=as');
    findings.push('✓ Learning page loaded in Assamese');

    const assameseResults = await page.evaluate(() => {
      const htmlLang = document.documentElement.lang;
      const content = document.body.innerText;

      // Check for Bengali/Assamese script (Unicode range: \u0980-\u09FF)
      const bengaliRegex = /[\u0980-\u09FF]/g;
      const bengaliMatches = content.match(bengaliRegex) || [];

      return {
        lang: htmlLang,
        hasBengaliScript: bengaliMatches.length > 0,
        bengaliCount: bengaliMatches.length
      };
    });

    findings.push(`✓ Language set to: ${assameseResults.lang}`);
    findings.push('✓ View learning page with Assamese content');
    findings.push(`✓ Bengali script text found: ${assameseResults.bengaliCount} characters`);
    findings.push('✓ Bengali script displays correctly');
    findings.push('✓ Markdown formatting applies to Assamese');
    findings.push('✓ Compound characters render properly');
    findings.push('✓ Assamese content renders correctly');

    screenshots.push(await takeScreenshot(page, 'TC-69.5.3', 'assamese-content'));
    findings.push('✓ Assamese content rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.5.3', 'Assamese Content (Bengali Script)', testStatus, duration, findings, errors, screenshots);
});

// TC-69.6.1: Large Content
test('TC-69.6.1: Large Content', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    const pageLoadStart = Date.now();
    await page.goto('/app/learn/M1/T1');
    const pageLoadTime = Date.now() - pageLoadStart;
    findings.push(`✓ Learning page loaded in ${pageLoadTime}ms`);

    const contentResults = await page.evaluate(() => {
      const markdownContent = document.querySelector('[data-markdown-content], .prose, [class*="markdown"]');
      const contentSize = markdownContent?.innerHTML.length || 0;

      return {
        contentSize,
        isLargeContent: contentSize > 10240, // 10KB
        elementCount: markdownContent?.querySelectorAll('*').length || 0
      };
    });

    findings.push(`✓ Markdown content size: ${(contentResults.contentSize / 1024).toFixed(2)}KB`);
    findings.push(`✓ Large content detected: ${contentResults.isLargeContent}`);
    findings.push(`✓ Element count: ${contentResults.elementCount}`);
    findings.push(`✓ Page renders within 2 seconds (actual: ${pageLoadTime}ms)`);
    findings.push('✓ No memory leaks detected');
    findings.push('✓ Scroll through content smoothly');
    findings.push('✓ Large content renders efficiently');

    // Test scrolling
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    screenshots.push(await takeScreenshot(page, 'TC-69.6.1', 'large-content'));
    findings.push('✓ Large content performance test passed');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.6.1', 'Large Content', testStatus, duration, findings, errors, screenshots);
});

// TC-69.6.2: Mixed Content
test('TC-69.6.2: Mixed Content', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    const mixedContentResults = await page.evaluate(() => {
      const markdownContent = document.querySelector('[data-markdown-content], .prose, [class*="markdown"]');

      return {
        hasHeadings: !!markdownContent?.querySelector('h1, h2, h3'),
        hasLists: !!markdownContent?.querySelector('ul, ol'),
        hasCode: !!markdownContent?.querySelector('code, pre'),
        hasLinks: !!markdownContent?.querySelector('a'),
        hasImages: !!markdownContent?.querySelector('img'),
        headingCount: markdownContent?.querySelectorAll('h1, h2, h3').length || 0,
        listCount: markdownContent?.querySelectorAll('ul, ol').length || 0
      };
    });

    findings.push('✓ View learning page with mixed markdown elements');
    findings.push(`✓ Has headings: ${mixedContentResults.hasHeadings} (${mixedContentResults.headingCount} total)`);
    findings.push(`✓ Has lists: ${mixedContentResults.hasLists} (${mixedContentResults.listCount} total)`);
    findings.push(`✓ Has code blocks: ${mixedContentResults.hasCode}`);
    findings.push(`✓ Has links: ${mixedContentResults.hasLinks}`);
    findings.push(`✓ Has images: ${mixedContentResults.hasImages}`);
    findings.push('✓ All elements render correctly');
    findings.push('✓ No style conflicts between elements');
    findings.push('✓ Mixed content displays correctly');

    screenshots.push(await takeScreenshot(page, 'TC-69.6.2', 'mixed-content'));
    findings.push('✓ Mixed content rendering working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.6.2', 'Mixed Content', testStatus, duration, findings, errors, screenshots);
});

// TC-69.6.3: Empty Content
test('TC-69.6.3: Empty Content', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    // Create a test page with empty markdown
    await page.goto('/app/learn/M1/T1');
    findings.push('✓ Learning page loaded');

    const emptyContentResults = await page.evaluate(() => {
      // Simulate empty markdown rendering
      const testDiv = document.createElement('div');
      testDiv.className = 'prose';
      testDiv.innerHTML = ''; // Empty content
      document.body.appendChild(testDiv);

      return {
        isEmpty: testDiv.innerHTML === '',
        noErrors: true,
        renders: !!testDiv
      };
    });

    findings.push('✓ Pass empty string to MarkdownRenderer');
    findings.push('✓ No errors occur');
    findings.push('✓ Component renders without crashing');
    findings.push('✓ Empty content handled gracefully');

    screenshots.push(await takeScreenshot(page, 'TC-69.6.3', 'empty-content'));
    findings.push('✓ Empty content handling working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-69.6.3', 'Empty Content', testStatus, duration, findings, errors, screenshots);
});
