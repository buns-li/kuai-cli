import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import execa from "execa";
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";
import { PkgData } from "./../../interface.d";
import { PackageInfo } from "../package-info";

export async function build(pkgInfo: PackageInfo): Promise<void> {
	const pkgData = require(path.resolve(pkgInfo.path, "./package.json")) as PkgData;

	await fs.remove(path.resolve(pkgInfo.path, "dist"));

	console.log(chalk.yellow(`Rolling up build ${pkgData.name}...`));
	await execa("rollup", ["-c", "--environment", `TARGET:${pkgInfo.dirname}`], { stdio: "inherit" });
	console.log();

	console.log(chalk.yellow(`Prettier ${pkgData.name} dist files...`));
	// 美化代码
	await execa(
		path.resolve(pkgInfo.root, "node_modules/.bin/prettier"),
		["--write", `packages/${pkgInfo.dirname}/dist/!(*.min.js|*.min.mjs)`],
		{
			stdio: "inherit"
		}
	);
	console.log();

	console.log(chalk.bold(chalk.yellow(`Rolling up type definitions for ${pkgData.name}...`)));
	const extractorConfigPath = path.resolve(pkgInfo.path, "api-extractor.json");
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

	await fs.remove(path.resolve(pkgInfo.path, "dist/packages"));

	return;
}
