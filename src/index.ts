import chalk from "chalk";
import path from "path";
import fs from "fs-extra";
import execa from "execa";
import { KuaiConfig, KuaiMonoRepo } from "./interface.d";
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
	sortObject
} from "./utils";

import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";

export async function createProject(usrStdIn: KuaiConfig): Promise<void> {
	if (!hasYarn()) {
		await installGlobalPkg("yarn");
	}

	if (usrStdIn.monorepo && !hasLerna()) {
		await installGlobalPkg("lerna");

		await initLerna();
	}

	const startTime = new Date().getTime();

	let spinner = startSpinner(chalk.bold(chalk.yellow(`downloading remoting template...`)));
	await downloadGitRepo(`${usrStdIn.repo || "buns-li/kuai-tpls"}#${usrStdIn.branch || "master"}`, usrStdIn.cwd, {
		clone: false
	});
	spinner.stop(true);
	console.log(chalk.green(`${chalk.greenBright("✔")} downloaded in ${usrStdIn.cwd}!`));
	console.log();
	console.log();

	const pkgData = await getPackageData(path.resolve(usrStdIn.cwd, "package.json"));

	// 如果是monorepo风格的项目
	if (pkgData.kuai && pkgData.kuai.monorepo) {
		const lernaData = await fs.readJSON(path.resolve(usrStdIn.cwd, "lerna.json"));
		if ((pkgData.kuai.monorepo as KuaiMonoRepo).independent) {
			// TODO: 更新lerna.json中的version信息
			lernaData.version = "independent";
		} else {
			lernaData.version = "1.0.0";
		}

		await fs.writeJSON(path.resolve(usrStdIn.cwd, "lerna.json"), lernaData);

		console.log(chalk.bold(chalk.green(`${chalk.greenBright("✔")}  updated lerna.json info!`)));
	}

	if (process.cwd() === usrStdIn.cwd) {
		console.log(chalk.bold(chalk.greenBright(`cd ${usrStdIn.appName} & yarn install`)));
	} else {
		console.log(chalk.bold(chalk.greenBright(`yarn install`)));
	}

	console.log();
	spinner = startSpinner("installing packages... ");
	await execAsync("yarn", { cwd: usrStdIn.cwd });
	spinner.stop(true);
	console.log(chalk.green(`${chalk.greenBright("✔")}  Installed packages!`));
	console.log();

	console.log(
		chalk.green(`${chalk.greenBright("✔")}  Done in ${Math.floor((new Date().getTime() - startTime) / 1000)}s !`)
	);

	if (hasVSCode()) {
		spinner = startSpinner("opening vscode... ");
		await execAsync(`code .`, { cwd: usrStdIn.cwd });
		spinner.stop(true);
	}
}

export async function createPackage(pkgName: string, depPkg?: string[][]): Promise<void> {
	// 创建package对应的文件夹和文件
	const cwd = process.cwd();

	const arr = pkgName.split("/");

	const pkgDirName = arr.length > 1 ? arr[arr.length - 1] : arr[0];

	// 包对应的地址
	const pkgDir = path.resolve(cwd, "packages", pkgDirName);

	const tsconfigPath = path.resolve(cwd, "tsconfig.json");
	const pkgJSONPath = path.resolve(cwd, `packages/${pkgDirName}/package.json`);
	const pkgApiExtractorPath = path.resolve(cwd, `packages/${pkgDirName}/api-extractor.json`);

	console.log(chalk.bold(chalk.yellow(`create ${pkgName} ...`)));
	// 执行lerna的创建包操作
	await execa(`lerna`, ["create", pkgName, `--description=${pkgName}`, "--yes"], { stdio: "ignore" });
	await fs.remove(path.resolve(pkgDir, `lib/${pkgDirName}.js`));
	await fs.writeFile(path.resolve(pkgDir, `lib/index.ts`), "");
	// 创建api-extractor.json
	await fs.writeFile(
		pkgApiExtractorPath,
		JSON.stringify(await import("./tpl/api-extractor").then(a => a.default), null, 2)
	);
	console.log(chalk.green(`${chalk.greenBright("✔")} Created ${pkgApiExtractorPath}!`));
	console.log(chalk.green(`${chalk.greenBright("✔")} Updated "CompilerOptions.paths" of ${tsconfigPath}!`));

	// 更新根目录下的tsconfig.json中的paths信息
	const tsConfig = await fs.readJSON(tsconfigPath);
	tsConfig.compilerOptions.paths = tsConfig.compilerOptions.paths || {};
	tsConfig.compilerOptions.paths[pkgName] = [`packages/${pkgDirName}/lib/index.ts`];
	await fs.writeFile(tsconfigPath, JSON.stringify(tsConfig, null, 2));

	const pkgData = await fs.readJSON(pkgJSONPath);
	pkgData.keywords = arr;
	pkgData.license = "MIT";
	pkgData.module = `dist/${pkgDirName}.esm.js`;
	pkgData.jsnext = `dist/${pkgDirName}.mjs`;
	pkgData.main = `dist/${pkgDirName}.cjs.js`;
	pkgData.unpkg = `dist/${pkgDirName}.js`;
	pkgData.types = `dist/${pkgDirName}.d.ts`;
	pkgData.typings = `dist/${pkgDirName}.d.ts`;
	pkgData.kuai = pkgData.kuai || {
		buildOptions: {
			formats: ["esm", "cjs", "global", "esm-browser"],
			external: null,
			onlyProd: false
		}
	};
	// 更新package.json中的依赖包选项
	if (depPkg && depPkg.length) {
		pkgData.dependencies = depPkg.reduce((prev, cur) => {
			prev[cur[0]] = cur[1];
			return prev;
		}, pkgData.dependencies || {});
	}
	await fs.writeFile(
		pkgJSONPath,
		JSON.stringify(
			sortObject(pkgData, [
				"name",
				"version",
				"description",
				"license",
				"private",
				"workspaces",
				"module",
				"jsnext",
				"main",
				"unpkg",
				"types",
				"typings",
				"directories",
				"files",
				"author",
				"repository",
				"kuai",
				"scripts",
				"dependencies",
				"devDependencies"
			]),
			null,
			2
		)
	);
	console.log(chalk.green(`${chalk.greenBright("✔")} Created ${pkgJSONPath}!`));

	await execa("lerna bootstrap", { stdio: "inherit" });

	console.log(chalk.green(`${chalk.greenBright("✔")} Created ${pkgName} in ${pkgDir}!`));
	console.log();
}

async function innerBuild(pkgName: string): Promise<void> {
	const arr = pkgName.split("/");
	const pkgDirName = arr.length > 1 ? arr[1] : arr[0];
	const pkgPath = path.resolve(process.cwd(), `packages/${pkgDirName}`);

	await fs.remove(path.resolve(pkgPath, "dist"));

	console.log(chalk.yellow(`Rolling up build ${pkgName}...`));
	await execa("rollup", ["-c", "--environment", `TARGET:${pkgName}`], { stdio: "inherit" });
	console.log();

	console.log(chalk.bold(chalk.yellow(`Rolling up type definitions for ${pkgName}...`)));
	const extractorConfigPath = path.resolve(pkgPath, "api-extractor.json");
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

	await fs.remove(path.resolve(pkgPath, "dist/packages"));
}

export async function build(pkg?: string): Promise<void> {
	const pkgs = [];

	if (pkg) {
		pkgs.push(pkg);
	} else {
		const pkgsDir = path.resolve(process.cwd(), "packages");
		const pkgs = fs
			.readdirSync(pkgsDir)
			.filter(pkg => fs.statSync(path.resolve(pkgsDir, pkg)).isDirectory())
			.map(dir => dir);

		for (let i = 0, l = pkgs.length; i < l; i++) {
			await innerBuild(pkgs[i]);
		}
	}
}
