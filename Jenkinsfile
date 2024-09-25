pipeline {
    agent { 
     label 'dev-3.6.124.160'
          }
        stages {
        stage('Checkout'){
            steps{
                cleanWs()
                sh 'rm -rf *'
                checkout scmGit(branches: [[name: '*/main']], extensions: [], userRemoteConfigs: [[credentialsId: 'ONEST-ID', url: 'https://github.com/tekdi/scholarship-backend.git']])
          }
        }
        
        stage ('Build-image') {
            steps {  
                      sh 'docker build -t scholarship-backend .' 
                   }
            }
       
       stage ('Deploy') {
            steps {
        
               
                      sh 'docker-compose up -d --force-recreate --no-deps backend' 
                   }
            }
       }
}

