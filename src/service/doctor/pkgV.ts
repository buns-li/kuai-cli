import path from "path";
import chalk from "chalk";
import execa from "execa";
import { PkgData, KV } from "./../../interface.d";

const resolveDepVersion = (dep: string, cwd: string): string => {
	const pkgData = require(path.resolve(cwd, `node_modules/${dep}/package.json`)) as PkgData;
	return pkgData.version;
};
export interface VersionMatch {
	local: string;
	remote: string;
	message: string;
	from: string;
}

function reduceCB(cwd: string, prev: KV<VersionMatch>, cur: string, source: KV<string>): KV<VersionMatch> {
	const localVersion = resolveDepVersion(cur, cwd);
	const remoteVersion = source[cur];
	if (localVersion !== remoteVersion) {
		prev[cur] = {
			from: "dep",
			local: localVersion,
			remote: remoteVersion,
			message: `${chalk.red("✘")} "${chalk.green(cur)}" expected ${chalk.underline(
				remoteVersion
			)}, but actual ${chalk.underline(localVersion)}`
		};
	}
	return prev;
}

export async function checkPackageVersion(projectRoot: string): Promise<void> {
	const pkgData = require(path.resolve(projectRoot, "./package.json")) as PkgData;

	Object.keys(pkgData.dependencies)
		.map(p => ({
			from: "dep",
			name: p,
			remote: pkgData.dependencies[p]
		}))
		.concat(
			Object.keys(pkgData.devDependencies).map(p => ({
				from: "dev-dep",
				name: p,
				remote: pkgData.devDependencies[p]
			}))
		)
		.reduce((prev, cur) => {
			const localVersion = resolveDepVersion(cur.name, projectRoot);
			if (localVersion !== cur.remote) {
				prev[cur.name] = {
					from: cur.from,
					local: localVersion,
					remote: cur.remote,
					message: `${chalk.red("✘")} "${chalk.green(cur)}" expected ${chalk.underline(
						cur.remote
					)}, but actual ${chalk.underline(localVersion)}`
				};
			}
			return prev;
		}, {} as KV<VersionMatch>);

	const unMatchDeps = Object.keys(pkgData.dependencies).reduce(
		(prev, cur) => reduceCB(projectRoot, prev, cur, pkgData.dependencies),
		{} as KV<VersionMatch>
	);

	const unMatchKeys = Object.keys(unMatchDeps);

	unMatchKeys.forEach(p => console.log(unMatchDeps[p].message));

	const deps = unMatchKeys.filter(p => unMatchDeps[p].from === "dep").map(p => p + "@" + unMatchDeps[p].remote);
	const devDeps = unMatchKeys
		.filter(p => unMatchDeps[p].from === "dev-dep")
		.map(p => p + "@" + unMatchDeps[p].remote);

	console.log(chalk.yellow(`Starting sync deps version ....`));

	if (deps && deps.length) {
		await execa("yarn", ["add", "-W"].concat(deps), { stdio: "inherit" });
	}

	if (devDeps && devDeps.length) {
		await execa("yarn", ["add", "-WD"].concat(devDeps), { stdio: "inherit" });
	}

	console.log(chalk.greenBright("✔") + chalk.green(" Sync deps version OK!"));

	return;
}
