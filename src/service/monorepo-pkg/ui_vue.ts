import chalk from "chalk";
import path from "path";
import execa from "execa";
import { callLernaCreate, supportVue } from "./helper";
import { startSpinner, OkOut } from "../../utils";
import { PackageInfo } from "../package-info";

export async function create(pkgInfo: PackageInfo, depPkg?: string[][]): Promise<void> {
	let spinner = startSpinner(`use "lerna create" to init ${pkgInfo.fullname}...`);
	await callLernaCreate(pkgInfo);
	spinner.stop();
	console.log();
	console.log(OkOut + chalk.greenBright(` use "lerna create" to init ${pkgInfo.fullname} OK!`));
	console.log();

	spinner = startSpinner(`generate or update relative files for ${pkgInfo.fullname} ...`);
	await supportVue(pkgInfo, depPkg);
	spinner.stop();
	console.log();
	console.log(OkOut + chalk.greenBright(` generate or update relative files for ${pkgInfo.fullname} OK!`));
	console.log();

	spinner = startSpinner(`prettier files`);
	// 美化代码
	await execa(path.resolve(pkgInfo.root, "node_modules/.bin/prettier"), ["--write", `**/*.{js,ts,jsx,tsx}`], {
		stdio: "ignore"
	});
	spinner.stop();
	console.log();
	console.log(OkOut + chalk.greenBright(` prettier files OK!`));
	console.log();

	spinner = startSpinner(`bootstrap ... `);
	await execa("lerna", ["bootstrap"], { cwd: pkgInfo.root, stdio: "ignore" });
	spinner.stop();
	console.log();
	console.log(OkOut + chalk.greenBright(` bootstrap OK!`));
	console.log();

	console.log(chalk.green(`${chalk.greenBright("✔")} Created ${pkgInfo.fullname} in ${pkgInfo.path}!`));
}
