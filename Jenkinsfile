node {
    timestamps {

        // Definizione delle variabili
        def imageName = 'albion_fe_image'
        def containerName = 'albion_fe_container'

        stage("Clean") {
            // Rimuove la directory di lavoro corrente
            deleteDir()
        }

        stage("Fetch") {
            // Estrae il codice sorgente da GitHub
            git credentialsId: 'JanraionGithub', url: 'https://github.com/Gianleo98/albion_fe.git'
        }

        stage("Docker Build") {
            // Rimuove l'immagine Docker esistente
            sh "docker rmi -f ${imageName} || true"
            // Pulisce le immagini Docker inutilizzate
            sh "docker image prune -f"
            // Costruisce la nuova immagine Docker (multi-stage: build Node + runtime Nginx)
            sh "docker build -t ${imageName} ."
        }

        stage("Docker Run") {
            // Ferma e rimuove il container Docker esistente, se presente
            sh "docker rm -f ${containerName} || true"
            // Esegue il container Docker con Nginx sulla porta 80
            sh "docker run -d --memory='128m' --restart=unless-stopped --network='host' --name ${containerName} ${imageName}"
        }
    }
}
