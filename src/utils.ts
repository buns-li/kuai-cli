import chalk from "chalk";
import download from "download-git-repo";
import fs from "fs-extra";
import { execSync, exec, ExecOptions, StdioOptions } from "child_process";
import { KV, PkgData } from "./interface";

const Spinner = require("cli-spinner").Spinner;

export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";
export const isLinux = process.platform === "linux";

/**
 * 在指定的cwd环境下的同步命令执行
 *
 * @export
 * @param {string} cmd 命令串
 * @param {string} cwd 指定的执行工作目录
 * @returns {string}
 */
export function tryRunWithNewCWD(cmd: string, cwd: string, stdio?: StdioOptions): string {
	try {
		return execSync(cmd, {
			cwd,
			stdio: stdio || "inherit"
		})
			.toString()
			.trim();
	} catch (e) {
		return "";
	}
}

/**
 * 执行命令行的promise版本
 *
 * @export
 * @param {string} cmd 命令串
 * @returns {Promise<string>}
 */
export function execAsync(cmd: string, options?: ExecOptions): Promise<string> {
	return new Promise((resolve, reject) => {
		exec(cmd, options, (err, stdout) => {
			err ? reject(err) : resolve(stdout.toString());
		});
	});
}

export function startSpinner(text: string): any {
	const spinner = new Spinner(`%s ${text}`);
	spinner.setSpinnerString("|/-\\");
	spinner.start();

	return spinner;
}

/**
 * 判断是否已全局安装yarn
 *
 * @export
 * @returns {boolean}
 */
export function hasYarn(): boolean {
	try {
		execSync("yarn --version", { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

/**
 * 判断是否已全局安装lerna
 *
 * @export
 * @returns {boolean}
 */
export function hasLerna(): boolean {
	try {
		execSync("lerna -v", { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

export function hasVSCode(): boolean {
	try {
		execSync("code -v", { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

/**
 * 安装全局npm包
 *
 * @export
 * @param {string} pkgName 依赖包的名称
 * @returns {Promise<void>}
 */
export async function installGlobalPkg(pkgName: string): Promise<void> {
	const spinner = startSpinner(`Installing ${pkgName}`);

	await execAsync(isWindows ? `npm i -g ${pkgName}` : `sudo npm i -g ${pkgName}`);

	spinner.stop(true);

	console.log(chalk.green(`${pkgName} Installed Succeed!`));
}

export async function initLerna(): Promise<void> {
	const spinner = startSpinner(`lerna init...`);

	await execAsync("lerna init");

	spinner.stop(true);

	console.log(chalk.green(`Lerna inited!`));
}

/**
 * converting a string to a `camel-case`
 *
 * @param {string} input a string input value
 * @param {string} [seperator="."] string seperator char
 * @returns a `camel-case` string
 */
export function toCamelCase(input: string, seperator = "-"): string {
	return input ? input.replace(new RegExp(`\\${seperator}(\\w)`, "g"), ($0, $1) => $1.toUpperCase()) : "";
}

/**
 * 排序键值对
 *
 * @export
 * @param {T} obj
 * @param {string[]} keyOrder
 * @param {boolean} [dontSortByUnicode]
 * @returns {T}
 */
export function sortObject(obj: KV<any>, keyOrder?: string[], dontSortByUnicode?: boolean): KV<any> {
	if (!obj) return;
	const res = {} as KV<any>;

	if (keyOrder) {
		keyOrder.forEach(key => {
			if (obj.hasOwnProperty(key)) {
				res[key] = obj[key];
				delete obj[key];
			}
		});
	}

	const keys = Object.keys(obj);

	!dontSortByUnicode && keys.sort();
	keys.forEach(key => {
		res[key] = obj[key];
	});

	return res;
}

/**
 * 1. 依赖包的排序（按照指定的key顺序,或者按照首字母)
 */
export function getMetadata(pkgName: string): any {
	const stdout = execSync(`yarn info ${pkgName} --json`).toString();
	const metadata = JSON.parse(stdout);
	return metadata.data;
}

/**
 *
 * 获取npm依赖包远程指定标记的版本号,默认去最新版本标记
 *
 * @param pkgName 依赖包名
 * @param versionFlag 指定的version标记
 */
export function getRemoteVersion(pkgName: string, versionFlag = "latest"): string {
	return getMetadata(pkgName)["dist-tags"][versionFlag];
}

/**
 *
 * 异步获取package.json的内容
 *
 * @param pkgPath package.json的文件地址
 */
export function getPackageData(pkgPath: string): Promise<PkgData> {
	return fs.readJSON(pkgPath, {
		encoding: "utf-8"
	});
}

/**
 *
 * 下载远程仓储库
 *
 * @param gitUrl  远程git地址
 * @param dest 存放git文件的目标目录地址
 * @param [opts] 可选参数
 */
export function downloadGitRepo(gitUrl: string, dest: string, opts?: KV<any>): Promise<void> {
	return new Promise((resolve, reject) => {
		download(gitUrl, dest, opts, (err: Error) => {
			err ? reject(err) : resolve();
		});
	});
}
