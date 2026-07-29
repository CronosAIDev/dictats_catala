// PM2 process definition per a dictats_catala.
// Ús a la VM:
//   pm2 start /var/dictats/app/ecosystem.config.js
//   pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: 'dictats-catala',
      script: 'src/index.js',
      cwd: '/var/dictats/app',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/dictats/logs/err.log',
      out_file: '/var/dictats/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
