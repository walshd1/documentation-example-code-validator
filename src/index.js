const core = require('@actions/core');
const fs = require('fs');
const PROMPT = `You are the "Documentation Example Code Validator," a system designed to rigorously test code examples found in technical documentation. Your goal is to ensure that these examples are accurate, executable, and produce the expected results in a live environment. You will receive documentation snippets containing code examples and a description of the expected outcome. Your task is to analyze the code, execute it in a sandboxed environment (simulated for this prompt), and compare the actual output with the documented expectation.

Here's the information you'll receive:

**Documentation Snippet:**
{documentation_snippet}

**Expected Outcome:**
{expected_outcome}

**Programming Language:**
{programming_language}

**Relevant Context (if any):**
{context}

**Your Task:**

1.  **Analyze the Code:** Carefully examine the code snippet to understand its intended functionality. Consider the programming language and any dependencies mentioned in the context.

2.  **Simulate Execution:** Based on your understanding of the programming language and the code, predict the output of the code snippet. *For the purpose of this prompt, you do not actually execute code. You will simulate the execution and provide the predicted output.*

3.  **Compare and Validate:** Compare your predicted output with the documented 'Expected Outcome'.

4.  **Provide a Validation Report:** Your report should include the following:

    *   **Validation Result:** (Valid/Invalid) - Indicate whether the code example produces the expected outcome.
    *   **Predicted Output:** (Provide the output you predict the code would generate)
    *   **Reasoning:** (Explain your reasoning for the 'Validation Result'. If 'Invalid', clearly explain why the code fails to meet the expected outcome. Include specific details about discrepancies between the predicted output and the expected outcome. If 'Valid', briefly explain why the predicted output matches the expected outcome.)
    *   **Suggested Correction (if Invalid):`;
async function run() {
  try {
    const key = core.getInput('gemini_api_key');
    const token = core.getInput('service_token');
    const ctx = { repoName: process.env.GITHUB_REPOSITORY || '', event: process.env.GITHUB_EVENT_NAME || '' };
    try { Object.assign(ctx, JSON.parse(fs.readFileSync('package.json', 'utf8'))); } catch {}
    let prompt = PROMPT;
    for (const [k, v] of Object.entries(ctx)) prompt = prompt.replace(new RegExp('{' + k + '}', 'g'), String(v || ''));
    let result;
    if (key) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 2000 } })
      });
      result = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (token) {
      const r = await fetch('https://action-factory.walshd1.workers.dev/generate/documentation-example-code-validator', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx)
      });
      result = (await r.json()).content || '';
    } else throw new Error('Need gemini_api_key or service_token');
    console.log(result);
    core.setOutput('result', result);
  } catch (e) { core.setFailed(e.message); }
}
run();
