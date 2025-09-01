module.exports = {
    apps: [{
      name: 'labsemble-server',
      script: 'server/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      cwd: '/var/www/labsemble/server',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', '.env']
    }]
  };