const { spawn } = require('child_process');
const PASS = 'woodhair249@';

function runDeploy() {
    console.log('🚀 Starting automated push to Cafe24...');
    
    const child = spawn('git', ['push', 'cafe24', 'master', '--force'], {
        shell: true
    });

    child.stderr.on('data', (data) => {
        const str = data.toString();
        process.stderr.write(str);
        
        if (str.toLowerCase().includes('password:')) {
            child.stdin.write(PASS + '\n');
        }
    });

    child.stdout.on('data', (data) => {
        process.stdout.write(data.toString());
    });

    child.on('close', (code) => {
        if (code === 0) {
            console.log('\n✅ Cafe24 deployment success!');
        } else {
            console.log(`\n❌ Deployment failed with code ${code}`);
        }
        process.exit(code);
    });
}

runDeploy();
