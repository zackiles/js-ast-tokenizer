import { jest } from "@jest/globals";
import parseFileOrCode from "./js-ast-tokenizer.js";
import * as fs from "node:fs/promises";

jest.mock("node:fs/promises");

describe("parseFileOrCode", () => {
	afterEach(() => {
		jest.resetAllMocks();
	});

	test("parses JavaScript code string", async () => {
		const code = `
      import React from 'react';
      
      const greeting = 'Hello, World!';
      
      function sayHello() {
        console.log(greeting);
      }
      
      export default sayHello;
    `;

		const result = await parseFileOrCode(code);

		expect(result.file).toBeNull();
		expect(result.content).toBe(code);
		expect(result.length).toBe(code.length);
		expect(result.nodes).toEqual({
			imports: [["react", "import React from'react'"]],
			classes: [],
			globalVariables: [["greeting", "const greeting='Hello, World!'"]],
			globalFunctions: [
				["sayHello", "function sayHello(){console.log(greeting)}"],
			],
			exports: [["default", "export default sayHello"]],
			externalReferences: [["console.log", "console.log(greeting)"]],
		});
	});

	test("parses JavaScript file", async () => {
		const filePath = "/path/to/file.js";
		const fileContent = `
      import { useState } from 'react';
      
      export function Counter() {
        const [count, setCount] = useState(0);
        
        return (
          <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
          </div>
        );
      }
    `;

		fs.stat.mockResolvedValue({});
		fs.readFile.mockResolvedValue(fileContent);

		const result = await parseFileOrCode(filePath);

		expect(result.file).toBe(filePath);
		expect(result.content).toBe(fileContent);
		expect(result.length).toBe(fileContent.length);
		expect(result.nodes).toEqual({
			imports: [["react", "import{useState}from'react'"]],
			classes: [],
			globalVariables: [],
			globalFunctions: [
				[
					"Counter",
					"export function Counter(){const[count,setCount]=useState(0);return(<div><p>Count: {count}</p><button onClick={()=>setCount(count+1)}>Increment</button></div>)}",
				],
			],
			exports: [],
			externalReferences: [
				["useState", "useState(0)"],
				["setCount", "setCount(count+1)"],
			],
		});
	});

	test("handles non-existent file", async () => {
		const filePath = "/path/to/non-existent-file.js";

		fs.stat.mockRejectedValue(new Error("File not found"));

		const result = await parseFileOrCode(filePath);

		expect(result.file).toBeNull();
		expect(result.content).toBe(filePath);
		expect(result.length).toBe(filePath.length);
		expect(result.nodes).toEqual({
			imports: [],
			classes: [],
			globalVariables: [],
			globalFunctions: [],
			exports: [],
			externalReferences: [],
		});
	});
});
