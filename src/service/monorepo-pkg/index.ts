import path from "path";
import { create as createLibOfMonorepo } from "./lib";
import { create as createUIOfVue } from "./ui_vue";
import { getPkgData } from "../../utils";
import { getPackageInfo } from "../package-info";

export async function createPackage(pkgFullName: string, depPkgs?: string[][]): Promise<void> {
	const cwd = process.cwd();
	const pkgPath = path.resolve(cwd, `packages/${path.basename(pkgFullName)}`);
	const pkgData = getPkgData(cwd);
	const pkgInfo = getPackageInfo(pkgPath, pkgData.kuai, pkgFullName);
	switch (pkgData.kuai.branch) {
		case "ui@vue":
			await createUIOfVue(pkgInfo, depPkgs);
			break;
		case "ui@react":
			break;
		case "ui@uniapp":
			break;
		case "ui@taro":
			break;
		case "lib@monorepo":
		case "master":
			await createLibOfMonorepo(pkgInfo, depPkgs);
			break;
	}
}
