pipeline {
    agent any

    environment {
        // NVM 및 Node 경로 설정
        NODE_VERSION = "v22.22.1"
        PATH = "/home/lmo0317ea/.nvm/versions/node/${NODE_VERSION}/bin:${env.PATH}"
        PROJECT_ROOT = "${env.WORKSPACE}"
    }

    stages {
        stage('Checkout') {
            steps {
                // SCM에서 소스 코드 가져오기
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Automated News Generation') {
            steps {
                echo 'Generating daily news...'
                sh 'bash webtools/news.sh 5 "테크,경제"'
            }
        }

        stage('Automated Popsong Content') {
            steps {
                echo 'Generating popsong learning content...'
                // 예시로 Bruno Mars의 Die With A Smile 생성
                sh 'bash webtools/popsong.sh "Bruno Mars" "Die With A Smile"'
            }
        }

        stage('Automated Puzzle Generation') {
            steps {
                echo 'Generating crossword puzzle...'
                sh 'bash webtools/puzzle.sh "생활영어" 8'
            }
        }
    }

    post {
        success {
            echo 'Trend Eng CI/CD Pipeline completed successfully!'
        }
        failure {
            echo 'Trend Eng CI/CD Pipeline failed. Check logs.'
        }
    }
}
