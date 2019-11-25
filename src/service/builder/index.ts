import path from "path";
import fs from "fs-extra";
import chalk from "chalk";

import { build as UIOfVueBuild } from "./ui@vue";
import { build as CmpOfVueBuild } from "./cmp@vue";
import { build as UIOfReactBuild } from "./ui@react";
import { build as CmpOfReactBuild } from "./cmp@react";
import { build as MonorepoBuild } from "./monorepo";
import { build as SingleLibBuild } from "./lib@single";

import { getKuaiConfig } from "../../utils";
import { getPackageInfo } from "../package-info";

/**
 *
 * 获取即将执行构建的包名称列表
 *
 * @param [pkg] 指定编译的包名称
 */
function getBuildingPkgs(pkg?: string): string[] {
	const cwd = process.cwd();

	let pkgs = [] as string[];

	const realPkgName = pkg && path.basename(pkg);

	const isInPkgs = !!~cwd.indexOf("packages") && path.basename(cwd) !== "packages";
	const isExistsPkgs = fs.existsSync(path.resolve(cwd, "packages"));

	if (isExistsPkgs) {
		if (realPkgName) {
			pkgs.push(realPkgName);
		} else {
			// 根目录执行的build
			const pkgsDir = path.resolve(cwd, "packages");
			pkgs = fs
				.readdirSync(pkgsDir)
				.map(pkg => path.resolve(pkgsDir, pkg))
				.filter(f => fs.statSync(f).isDirectory());
		}
	} else if (isInPkgs) {
		// 每个包内执行的build
		if (realPkgName === path.basename(cwd)) {
			pkgs.push(realPkgName);
		} else {
			console.log(chalk.redBright(`! Warning: ${pkg} not found in ${cwd}`));
		}
	}

	return pkgs;
}

export async function build(pkg?: string): Promise<void> {
	const kuai = getKuaiConfig(process.cwd());

	if (!kuai) {
		console.log(chalk.redBright(`Error: Can't find "kuai" config in package.json`));
		return;
	}

	const pkgs = getBuildingPkgs(pkg);

	for (let i = 0, l = pkgs.length; i < l; i++) {
		switch (kuai.branch) {
			case "ui@vue":
				await UIOfVueBuild(getPackageInfo(pkgs[i], kuai));
				break;
			case "ui@react":
				await UIOfReactBuild(getPackageInfo(pkgs[i], kuai));
				break;
			case "ui@uniapp":
				break;
			case "ui@taro":
				break;
			case "cmp@vue":
				await CmpOfVueBuild(pkgs[i]);
				break;
			case "cmp@react":
				await CmpOfReactBuild(pkgs[i]);
				break;
			case "cmp@uniapp":
				break;
			case "cmp@taro":
				break;
			case "lib@single":
				await SingleLibBuild(pkgs[i]);
				break;
			case "master":
			case "lib@monorepo":
				await MonorepoBuild(getPackageInfo(pkgs[i], kuai));
				break;
		}
	}
}
