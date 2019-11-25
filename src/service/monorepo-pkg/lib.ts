import path from "path";
import chalk from "chalk";
import execa from "execa";
import { callLernaCreate, supportLib } from "./helper";
import { startSpinner, OkOut } from "../../utils";
import { PackageInfo } from "../package-info";

export async function create(pkgInfo: PackageInfo, depPkg?: string[][]): Promise<void> {
	let spinner = startSpinner(`Use "lerna create" to init ${pkgInfo.fullname}...`);
	await callLernaCreate(pkgInfo);
	spinner.stop();
	console.log();
	console.log(OkOut + chalk.greenBright(` Use "lerna create" to init ${pkgInfo.fullname} OK!`));
	console.log();

	spinner = startSpinner(`Generate or Update relative files for ${pkgInfo.fullname} ...`);
	await supportLib(pkgInfo, depPkg);
	spinner.stop();
	console.log();
	console.log(OkOut + chalk.greenBright(` Generate or Update relative files for ${pkgInfo.fullname} OK!`));
	console.log();

	spinner = startSpinner(`Prettier files...`);
	// 美化代码
	await execa(
		path.resolve(pkgInfo.root, "node_modules/.bin/prettier"),
		["--write", `packages/${pkgInfo.dirname}/**/*.{js,ts}`],
		{
			stdio: "ignore"
		}
	);
	spinner.stop();
	console.log();
	console.log(OkOut + chalk.greenBright(` Prettier files OK!`));
	console.log();

	spinner = startSpinner(`bootstrap ... `);
	await execa("lerna", ["bootstrap"], { cwd: pkgInfo.root, stdio: "ignore" });
	spinner.stop();
	console.log();
	console.log(OkOut + chalk.greenBright(` bootstrap OK!`));
	console.log();

	console.log(chalk.green(`${chalk.greenBright("✔")} Created ${pkgInfo.fullname} in ${pkgInfo.path}!`));
}
