# JS AST Tokenizer

A JavaScript code tokenizer for ease in using with code embeddings and vector storage. This library analyzes JavaScript files or code snippets and provides a structured tokenization output, making it suitable for code analysis, embeddings, and search applications.

## Features

- Tokenizes JavaScript files or strings into key components like imports, classes, functions, variables, and more.
- Designed to work seamlessly with code embeddings and vector storage systems.
- Supports modern JavaScript syntax, including JSX, TypeScript, and class properties.

## Installation

To install the library, use npm:

```bash
npm install js-ast-tokenizer
```

## Usage

Here’s a basic example of how to use the tokenizer:

### Example 1: Tokenizing a JavaScript File

```javascript
import tokenizeFileOrCode from 'js-ast-tokenizer';

const result = await tokenizeFileOrCode('path/to/your/file.js');
console.log(result);
```

### Example 2: Tokenizing JavaScript Code String

```javascript
import tokenizeFileOrCode from 'js-ast-tokenizer';

const jsCode = `
  import { somethingExternal } from 'some-module';

  class SomeClass {
    constructor() {
      this.value = 42;
    }
  }

  const someVariable = 2;

  function someFunction() {
    return 'Hello, world!';
  }

  someExternalFunction();
  someExternalClass.someMethod();
  
  export { someFunction };
  export default SomeClass;
`;

const result = await tokenizeFileOrCode(jsCode);
console.log(result);
```

### Output

The output of the `tokenizeFileOrCode` function will be a structured object that represents the tokenized components of your JavaScript code. Below is an example output with the key components, including `globalVariables`, `externalReferences`, and `exports`:

```json
{
  "file": "path/to/your/file.js",
  "nodes": {
    "imports": [["some-module", "import { somethingExternal } from 'some-module';"]],
    "classes": [["SomeClass", "class SomeClass { constructor() { this.value = 42; } }"]],
    "globalVariables": [
      ["someVariable", "const someVariable = 2"]
    ],
    "globalFunctions": [
      ["someFunction", "function someFunction() { return 'Hello, world!'; }"]
    ],
    "exports": [
      ["someFunction", "export { someFunction }"],
      ["default", "export default SomeClass"]
    ],
    "externalReferences": [
      ["someExternalFunction", "someExternalFunction()"],
      ["someExternalClass.someMethod", "someExternalClass.someMethod()"]
    ]
  },
  "content": "...",
  "length": 375
}
```

## API

### `tokenizeFileOrCode(input: string): Promise<TokenizeResult>`

Tokenizes the given input, which can be either a file path or a JavaScript code string.

#### Parameters

- **input**: A string representing either a file path or a JavaScript code snippet.

#### Returns

- A `Promise` that resolves to a `TokenizeResult` object containing details about the tokenized JavaScript code.

### TokenizeResult Structure

The result object contains the following properties:

```typescript
interface TokenizeResult {
  file: string | null;  // Full file path if input is a file, otherwise null
  nodes: TokenizedStructure;  // Tokenized components of the code
  content: string;  // The original JavaScript code or file content
  length: number;  // The length of the input code
}

interface TokenizedStructure {
  imports: [string, string][];  // List of [moduleName, importStatement]
  classes: [string, string][];  // List of [className, classCode]
  globalVariables: [string, string][];  // List of [variableName, declaration]
  globalFunctions: [string, string][];  // List of [functionName, functionCode]
  exports: [string, string][];  // List of [exportedName, exportCode]
  externalReferences: [string, string][];  // List of external references [referenceName, fullExpression]
}
```

### Examples of `globalVariables`, `externalReferences`, and `exports`

- **globalVariables**: This array captures top-level variables in the file, such as `const someVariable = 2`. It includes the variable name and its full declaration. Example:
  
  ```json
  [
    ["someVariable", "const someVariable = 2"]
  ]
  ```

- **externalReferences**: This array captures references to variables, functions, or classes that are not defined in the local scope but are used within the code, such as `someExternalFunction()` and `someExternalClass.someMethod()`. Example:
  
  ```json
  [
    ["someExternalFunction", "someExternalFunction()"],
    ["someExternalClass.someMethod", "someExternalClass.someMethod()"]
  ]
  ```

- **exports**: This array captures any named or default exports from the module. Example:

  ```json
  [
    ["someFunction", "export { someFunction }"],
    ["default", "export default SomeClass"]
  ]
  ```

## Designed for Code Embeddings and Vector Storage

The output of this tokenizer is specifically structured to facilitate integration with code embeddings and vector storage systems. By breaking down code into its components, this library can help developers build searchable embeddings of JavaScript code for tasks like:

- Code similarity search
- Syntax-aware code completion
- Embedding-based code search

## Advanced Configuration

The tokenizer uses various Babel plugins to support modern JavaScript features. The following Babel plugins are enabled by default:

- JSX
- TypeScript
- Optional Chaining
- Class Properties

You can extend the functionality by adjusting the Babel configuration if necessary.

## Error Handling

- If the input is a file path but the file is not found or cannot be read, the tokenizer treats the input as raw JavaScript code.
- The tokenizer leverages Babel’s `errorRecovery` mode to gracefully handle parsing errors and attempt to continue.

## License

This library is licensed under the MIT License. See the [LICENSE](./LICENSE) file for more details.

---

### Key Additions

1. **Naming Consistency**: Classes are referred to as `SomeClass`, functions as `someFunction`, exports as `someExport`, and external references as `someExternalReference`, providing consistent and clear naming.
2. **Example of `externalReferences`**: Demonstrates variables, functions, or classes that exist outside the current file but are referenced within it.

This update aligns with your preference for specific naming conventions while enhancing clarity.
