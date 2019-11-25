import chalk from "chalk";
import path from "path";
import fs from "fs-extra";
import { KuaiConfig, BranchType } from "../interface.d";
import {
	startSpinner,
	downloadGitRepo,
	hasYarn,
	installGlobalPkg,
	hasLerna,
	execAsync,
	hasVSCode,
	getPackageData,
	initLerna,
	hasRollup
} from "../utils";

function validIsMonorepo(branch: BranchType): boolean {
	return branch === "lib@monorepo" || branch === "master" || branch.startsWith("ui@");
}

function validIsIndependent(branch: BranchType): boolean {
	return branch === "lib@monorepo";
}

async function prepareGloablPackage(usrStdIn: KuaiConfig): Promise<void> {
	if (!hasRollup()) {
		await installGlobalPkg("rollup");
	}

	if (!hasYarn()) {
		await installGlobalPkg("yarn");
	}

	if (validIsMonorepo(usrStdIn.branch) && !hasLerna()) {
		await installGlobalPkg("lerna");
	}
}

async function downloadGitTpl(repo: string, branch: string, cwd: string): Promise<void> {
	const spinner = startSpinner(chalk.bold(chalk.yellow(`downloading remoting template...`)));
	await downloadGitRepo(`${repo || "buns-li/kuai-tpls"}#${branch || "master"}`, cwd, {
		clone: false
	});
	spinner.stop(true);
	console.log(chalk.green(`${chalk.greenBright("✔")} downloaded in ${cwd}!`));
}

async function doInitForMonorepo(cwd: string): Promise<void> {
	const pkgData = await getPackageData(path.resolve(cwd, "package.json"));

	if (pkgData.kuai && validIsMonorepo(pkgData.kuai.branch)) {
		const lernaData = await fs.readJSON(path.resolve(cwd, "lerna.json"));
		lernaData.version = validIsIndependent(pkgData.kuai.branch) ? "independent" : "1.0.0";
		await fs.writeFile(path.resolve(cwd, "lerna.json"), JSON.stringify(lernaData, null, 2));
		console.log(chalk.bold(chalk.green(`${chalk.greenBright("✔")}  updated lerna.json info!`)));
		await initLerna(cwd);
	}
}

async function doYarnInstall(cwd: string): Promise<void> {
	const spinner = startSpinner("installing packages... ");
	await execAsync("yarn", { cwd });
	spinner.stop(true);
	console.log(chalk.green(`${chalk.greenBright("✔")} Installed packages!`));
}

async function openWithVSCode(cwd: string): Promise<void> {
	if (hasVSCode()) {
		const spinner = startSpinner("opening vscode... ");
		await execAsync(`code .`, { cwd });
		spinner.stop(true);
	}
}

/**
 * 创建项目
 *
 * @param usrStdIn
 */
export async function createProject(usrStdIn: KuaiConfig): Promise<void> {
	const startTime = new Date().getTime();

	await prepareGloablPackage(usrStdIn);

	await downloadGitTpl(usrStdIn.repo, usrStdIn.branch, usrStdIn.cwd);
	console.log();

	await doInitForMonorepo(usrStdIn.cwd);
	console.log();

	if (process.cwd() === usrStdIn.cwd) {
		console.log(chalk.bold(chalk.greenBright(`yarn install`)));
	} else {
		console.log(chalk.bold(chalk.greenBright(`cd ${usrStdIn.appName} & yarn install`)));
	}
	console.log();

	await doYarnInstall(usrStdIn.cwd);
	console.log();

	console.log(
		chalk.green(`${chalk.greenBright("✔")} Done in ${Math.floor((new Date().getTime() - startTime) / 1000)}s !`)
	);

	await openWithVSCode(usrStdIn.cwd);
}
