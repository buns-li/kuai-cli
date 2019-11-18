#! /usr/bin/env node

require("v8-compile-cache");

const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const program = require("commander");
const { prompt } = require("inquirer");
const validProjectName = require("validate-npm-package-name");
const { say } = require("cfonts");

const { createProject, createPackage, build } = require("../dist/index");

say("kuai", {
	colors: ["greenbright"],
	font: "simple",
	space: false
});

console.log();

program
	.command("create <appname>")
	.description("快速创建类库项目")
	.option("-r --repo", "远程仓库地址")
	.option("-b --branch", "仓库分支")
	.action(async (appname, cmdObj) => {
		const usrStdin = {
			appName: appname,
			cwd: path.resolve(process.cwd(), appname),
			repo: cmdObj.repo,
			branch: cmdObj.branch || "master"
		};

		const isCurrent = appname === ".";

		const name = isCurrent ? path.basename(usrStdin.cwd) : appname;

		const result = validProjectName(name);

		if (!result.validForNewPackages) {
			console.error(chalk.red(`Invalid project name: "${name}"`));

			result.errors &&
				result.errors.forEach(err => {
					console.error(chalk.red.dim("Error: " + err));
				});

			result.warnings &&
				result.warnings.forEach(warn => {
					console.error(chalk.red.dim("Warning: " + warn));
				});
			process.exit(1);
		}

		if (isCurrent) {
			const { ok } = await prompt([
				{
					name: "ok",
					type: "confirm",
					message: `Generate project in current directory?`
				}
			]);

			if (!ok) {
				return;
			}
		} else if (fs.existsSync(usrStdin)) {
			// 如果存在,则提示用户
			console.log(chalk.red(`Target directory is not empty!`));
			return;
		}

		usrStdin.appName = name;

		if (usrStdin.repo) {
			createProject(usrStdin).catch(err => {
				console.log();
				console.log(err);
				process.exit(0);
			});
			return;
		}

		usrStdin.repo = "buns-li/kuai-tpls";

		/**
		 *
		 * 选择需要创建的类库项目类型
		 *
		 */
		const { projectType } = await prompt({
			name: "projectType",
			type: "list",
			message: "项目类型 =>",
			choices: ["node-lib", "web-lib", "web-ui"]
		});

		usrStdin.projectType = projectType;

		const { monorepo } = await prompt({
			name: "monorepo",
			type: "confirm",
			message: "是否采用monorepo项目风格?"
		});

		usrStdin.monorepo = monorepo;

		if (monorepo) {
			const { independent } = await prompt({
				name: "independent",
				type: "confirm",
				message: "版本是否独立管理?"
			});
			usrStdin.monorepo = { independent };
		}

		if (projectType === "web-ui") {
			const { uiFrame } = await prompt({
				name: "uiFrame",
				type: "list",
				message: "UI库选型",
				choices: ["vue", "react"]
			});

			usrStdin.uiFrame = uiFrame;
		}

		if (usrStdin.projectType !== "web-ui") {
			usrStdin.branch = usrStdin.monorepo ? "master" : "non-monorepo";
		} else {
			usrStdin.branch = `${usrStdin.uiFrame}-${usrStdin.monorepo ? "ui-lib" : "cmp"}`;
		}

		createProject(usrStdin).catch(err => {
			console.log();
			console.log(chalk.red("✘ Error:" + err.message));
			process.exit(0);
		});
	});

program
	.command("package [packageFullName]")
	.alias("pkg")
	.description("在本项目中构建新的package项目")
	.action(async packageFullName => {
		const pkgsDirPath = path.resolve(process.cwd(), "packages");
		const pkgDirName = path.basename(packageFullName);
		const pkgPath = path.resolve(pkgsDirPath, pkgDirName);

		if (fs.existsSync(pkgPath)) {
			console.log(chalk.yellowBright.dim(`! Warning: Exists package "${pkgDirName}"`));
			return;
		}

		const pkgsDirs = fs
			.readdirSync(pkgsDirPath)
			.filter(p => fs.statSync(path.resolve(pkgsDirPath, p)).isDirectory());

		let depsPkg;
		if (pkgsDirs.length) {
			const kv = {};
			const packageFullNames = pkgsDirs
				.map(pkg => require(path.resolve(pkgsDirPath, `${pkg}/package.json`)))
				.filter(p => path.basename(p.name) !== packageFullName);

			const { pkgs } = await prompt({
				name: "pkgs",
				type: "checkbox",
				message: "需要依赖的package =>",
				choices: packageFullNames.map(p => p.name)
			});

			depsPkg = pkgs.map(pkg => {
				const t = packageFullNames.filter(p => p.name === pkg);
				return [t[0].name, t[0].version];
			});
		}

		createPackage(packageFullName, depsPkg).catch(async err => {
			console.log();
			console.log(err);
			await fs.remove(pkgPath);
			process.exit(0);
		});
	});

program
	.command("build [pkg]")
	.description("build all packages or target package")
	.action(pkg => {
		build(pkg).catch(err => {
			console.log();
			console.log(err);
			process.exit(0);
		});
	});

program.parse(process.argv);
