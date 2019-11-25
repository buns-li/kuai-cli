import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import execa from "execa";
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";

export async function build(cwd: string): Promise<void> {
	await fs.remove(path.resolve(cwd, "dist"));

	console.log(chalk.yellow(`Rolling up build ...`));
	await execa("rollup", ["-c"], { stdio: "inherit" });

	// 美化代码
	await execa(path.resolve(cwd, "node_modules/.bin/prettier"), ["--write", `dist/index.js`], {
		stdio: "inherit"
	});
	console.log();

	console.log(chalk.bold(chalk.yellow(`Rolling up type definitions ...`)));
	const extractorConfigPath = path.resolve(cwd, "api-extractor.json");
	const extractorConfig = ExtractorConfig.loadFileAndPrepare(extractorConfigPath);
	const result = Extractor.invoke(extractorConfig, {
		localBuild: true,
		showVerboseMessages: true
	});
	if (result.succeeded) {
		console.log(chalk.bold(chalk.green(`API Extractor completed successfully.`)));
	} else {
		console.error(
			`API Extractor completed with ${result.errorCount} errors` + ` and ${result.warningCount} warnings`
		);
		process.exitCode = 1;
	}
	console.log();

	await fs.remove(path.resolve(cwd, "dist/src"));
}
