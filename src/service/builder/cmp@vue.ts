import path from "path";
import fs from "fs-extra";
import execa from "execa";
import chalk from "chalk";
import { PkgData } from "./../../interface.d";

export async function build(projectRoot: string): Promise<void> {
	const pkgData = require(path.resolve(projectRoot, "./package.json")) as PkgData;
	const prettierBinPath = path.resolve(projectRoot, "./node_modules/.bin/prettier");
	await fs.remove(path.resolve(projectRoot, "dist"));

	console.log(chalk.yellow(`Rolling up build ${pkgData.name}...`));
	await execa("rollup", ["-c"], { stdio: "inherit" });
	// 美化代码
	await execa(prettierBinPath, ["--write", `dist/index.js`], { stdio: "inherit" });
	console.log();
}
