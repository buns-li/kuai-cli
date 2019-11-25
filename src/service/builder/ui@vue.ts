import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import execa from "execa";
import { PackageInfo } from "./../package-info";
import { PkgData } from "../../interface";

export async function build(pkgInfo: PackageInfo): Promise<void> {
	const prettierBinPath = path.resolve(pkgInfo.root, "node_modules/.bin/prettier");

	let pkgData = require(path.resolve(pkgInfo.path, "./package.json")) as PkgData;

	await fs.remove(path.resolve(pkgInfo.path, "dist"));

	console.log(chalk.yellow(`Rolling up build ${pkgData.name}...`));
	await execa("rollup", ["-c", "--environment", `TARGET:${pkgInfo.dirname}`], {
		stdio: "inherit"
	});
	// 美化代码
	await execa(prettierBinPath, ["--write", `packages/${pkgInfo.dirname}/dist/index.js`], {
		stdio: "inherit"
	});
	console.log();

	await fs.remove(path.resolve(pkgInfo.root, "dist"));

	pkgData = require(path.resolve(pkgInfo.root, "./package.json")) as PkgData;

	console.log(chalk.yellow(`Rolling up build ${pkgData.name}...`));
	await execa("rollup", ["-c", "--environment", `TARGET:*`], { stdio: "inherit" });
	// 美化代码
	await execa(prettierBinPath, ["--write", "dist/index.js"], {
		stdio: "inherit"
	});
	console.log();

	// console.log(chalk.bold(chalk.yellow(`Rolling up type definitions for ${pkgData.name}...`)));

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
	// console.log();

	return;
}
