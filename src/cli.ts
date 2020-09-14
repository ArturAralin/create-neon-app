import * as fs from 'fs';
import * as path from 'path';
import * as commander from 'commander';
import * as handlebars from 'handlebars';

interface ProjectProperties {
  fullProjectPath: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  neonCliVersion: string;
  neonBuildVersion: string;
}

const CWD = process.cwd();
const program = new commander.Command();

program.version('0.1.0');

function stdWrite(s: string) {
  process.stdout.write(`${s}\n`);
}

function stdAsk(q: string, defaultValue: string): Promise<string> {
  process.stdout.write(`${q} (${defaultValue}): `);

  return new Promise((resolve, rejects) => {
    process.stdin.once('data', (line) => {
      const value = line.toString().slice(0, -1);
      resolve(value || defaultValue);
    });

    process.stdin.once('error', (e) => {
      rejects(e);
    });
  });
}


function isFreePath(fullProjectPath: string) {
  try {
    fs.statSync(fullProjectPath);

    return false;
  } catch {
    return true;
  }
}

function processFile(opts: ProjectProperties, filePath: string) {
  const template = fs.readFileSync(path.resolve(__dirname, `../template/${filePath}.hbs`), 'utf-8');
  const fileContent = handlebars.compile(template)({ project: opts });
  const { dir } = path.parse(filePath);

  if (dir) {
    fs.mkdirSync(path.resolve(opts.fullProjectPath, dir), { recursive: true });
  }

  fs.writeFileSync(path.resolve(opts.fullProjectPath, filePath), fileContent);
}

async function createProject(opts: ProjectProperties) {
  if (!isFreePath(opts.fullProjectPath)) {
    stdWrite(`${opts.fullProjectPath} is non empty`);

    return;
  }

  fs.mkdirSync(opts.fullProjectPath);

  processFile(opts, 'package.json');
  processFile(opts, '.gitignore');
  processFile(opts, 'README.md');
  processFile(opts, 'lib/index.js');
  processFile(opts, 'native/build.rs');
  processFile(opts, 'native/Cargo.toml');
  processFile(opts, 'native/src/lib.rs');
}

async function createNewNeonApp(projectName: string) {
  const fullProjectPath = path.resolve(CWD, `./${projectName}`);
  const projectVersion = await stdAsk('Version', '1.0.0');
  const projectDescription = await stdAsk('Description', '');
  const authorName = await stdAsk('Author', '');
  const authorEmail = await stdAsk('Email', '');
  const license = await stdAsk('License', 'MIT');

  const opts: ProjectProperties = {
    fullProjectPath,
    name: projectName,
    version: projectVersion,
    description: projectDescription,
    author: `${authorName} <${authorEmail}>`,
    license,
    neonCliVersion: '^0.4.0',
    neonBuildVersion: '0.4.0'
  };

  await createProject(opts);

  process.exit(0);
}

program
  .command('new <name>', { isDefault: true })
  .description('creates new Neon app')
  .action(createNewNeonApp);


program.parse(process.argv);
