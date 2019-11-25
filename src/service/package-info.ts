import path from "path";
import fs from "fs";
import { getUIPrefix, toCamelCase, getPkgData } from "../utils";
import { BranchType, PkgData, KuaiConfig } from "../interface";

export interface PackageInfo {
	/**
	 * 当前包所在的项目根目录
	 */
	root: string;
	/**
	 * 当前packages的工作目录
	 */
	cwd: string;
	/**
	 * 全名
	 */
	fullname: string;
	/**
	 * package对应的目录名称
	 */
	dirname: string;
	/**
	 * camel-case风格的命名
	 */
	camelCaseName: string;
	/**
	 * package对应的完整物理路径
	 */
	path: string;
	/**
	 * package中lib文件夹对应的物理路径
	 */
	libPath: string;
	/**
	 * package中test文件夹对应的物理路径
	 */
	testPath: string;
	/**
	 * 使用的方式
	 */
	usage: BranchType;
	/**
	 * package.json数据
	 */
	pkgData: PkgData;

	kuai: KuaiConfig;
	/**
	 * 同级目录
	 */
	siblings: string[];
}

/**
 *
 * 获取packages中某个包的信息
 *
 * @param pkgPath 该包的物理路径
 * @param kuai 整个项目的kuai配置信息
 *
 * @returns 包信息
 */
export function getPackageInfo(pkgPath: string, kuai: KuaiConfig, pkgFullName?: string): PackageInfo {
	const dirname = path.basename(pkgPath);

	const uiPrefix = getUIPrefix(kuai);

	const purePkgName = uiPrefix ? dirname.replace(uiPrefix, "") : "";

	const camelCaseName = purePkgName
		? toCamelCase(uiPrefix.toUpperCase() + "-" + purePkgName[0].toUpperCase() + purePkgName.substring(1))
		: "";

	const cwd = path.resolve(pkgPath, "../");

	const pkgData = pkgFullName ? ({ name: pkgFullName } as PkgData) : getPkgData(pkgPath);

	return {
		root: path.resolve(cwd, "../"),
		cwd,
		dirname,
		fullname: pkgData.name,
		camelCaseName,
		path: pkgPath,
		libPath: path.resolve(pkgPath, `./lib/`),
		testPath: path.resolve(pkgPath, `./test/`),
		usage: kuai.branch,
		pkgData,
		kuai,
		siblings: fs
			.readdirSync(cwd)
			.map(f => path.resolve(cwd, f))
			.filter(f => f !== pkgPath && fs.statSync(f).isDirectory())
	} as PackageInfo;
}
