import chalk from "chalk";
import path from "path";
import execa from "execa";
import { useLernaCreate, createApiExtractor, updateTSConfigPaths, updatePkgPackageDotJson } from "./helper";

export async function create(pkgName: string, depPkg?: string[][]): Promise<void> {
	// 创建package对应的文件夹和文件
	const cwd = process.cwd();

	// 包对应的地址
	const pkgDir = path.resolve(cwd, "packages", path.basename(pkgName));

	console.log(chalk.bold(chalk.yellow(`create ${pkgName} ...`)));

	await useLernaCreate(pkgDir, pkgName, true);
	console.log();

	await createApiExtractor(pkgDir, await import("../../tpl/api-extractor").then(a => a.default));
	console.log();

	await updateTSConfigPaths(pkgDir, pkgName);
	console.log();

	await updatePkgPackageDotJson(pkgDir, pkgName, depPkg);
	console.log();

	await execa("lerna bootstrap", { stdio: "inherit" });
	console.log(chalk.green(`${chalk.greenBright("✔")} Created ${pkgName} in ${pkgDir}!`));
}
