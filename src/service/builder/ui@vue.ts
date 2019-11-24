import { PkgData } from "../../interface";
import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import execa from "execa";
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";

export async function build(pkgPath: string): Promise<void> {
	const pkgDirName = path.basename(pkgPath);
	const projectRoot = path.dirname(path.resolve(pkgPath, "../"));
	const prettierBinPath = path.resolve(projectRoot, "node_modules/.bin/prettier");

	let pkgData = require(path.resolve(pkgPath, "./package.json")) as PkgData;

	await fs.remove(path.resolve(pkgPath, "dist"));

	console.log(chalk.yellow(`Rolling up build ${pkgData.name}...`));
	await execa("rollup", ["-c", "--environment", `TARGET:${pkgDirName}`], {
		stdio: "inherit"
	});
	// 美化代码
	await execa(prettierBinPath, ["--write", `packages/${pkgDirName}/dist/index.js`], {
		stdio: "inherit"
	});
	console.log();

	await fs.remove(path.resolve(projectRoot, "dist"));

	pkgData = require(path.resolve(projectRoot, "./package.json")) as PkgData;

	console.log(chalk.yellow(`Rolling up build ${pkgData.name}...`));
	await execa("rollup", ["-c", "--environment", `TARGET:*`], { stdio: "inherit" });
	// 美化代码
	await execa(prettierBinPath, ["--write", "dist/index.js"], {
		stdio: "inherit"
	});
	console.log();

	console.log(chalk.bold(chalk.yellow(`Rolling up type definitions for ${pkgData.name}...`)));

	// const extractorConfigPath = path.resolve(projectRoot, "./api-extractor.json");
	// const extractorConfig = ExtractorConfig.loadFileAndPrepare(extractorConfigPath);
	// const result = Extractor.invoke(extractorConfig, {
	// 	localBuild: true,
	// 	showVerboseMessages: true
	// });
	// if (result.succeeded) {
	// 	console.log(chalk.bold(chalk.green(`API Extractor completed successfully.`)));
	// } else {
	// 	console.error(
	// 		`API Extractor completed with ${result.errorCount} errors` + ` and ${result.warningCount} warnings`
	// 	);
	// 	process.exitCode = 1;
	// }
	console.log();

	return;
}
