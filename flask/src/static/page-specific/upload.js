let modalAlert = (title, msg) => {
    let modal = new bootstrap.Modal(document.getElementById("uploadModal"));
    document.getElementById("uploadModalLabel").innerText = title;
    document.getElementById("uploadModalText").innerText = msg;
    modal.show();
}

let setSensorType = (type) => {
    event.preventDefault();
    document.getElementById("sensor_selector_raw_image").classList.remove("active");
    document.getElementById("sensor_selector_pre_classified").classList.remove("active");
    document.getElementById("sensor_selector_flowcam").classList.remove("active");
    document.getElementById("sensor_selector_ifcb").classList.remove("active");
    switch (type) {
        case "ifcb":
            document.getElementById("sensor_selector_ifcb").classList.add("active");
            break;
        case "flowcam":
            document.getElementById("sensor_selector_flowcam").classList.add("active");
            break;
        case "pre-classified":
            document.getElementById("sensor_selector_pre_classified").classList.add("active");
            break;
        default:
            document.getElementById("sensor_selector_raw_image").classList.add("active");
    }
}

let analyseMetadata = (form, response) => {
    const progressBar = form.querySelector(".progress-bar");
    const spinnerContainer = form.querySelector(".spinner-container");
    spinnerContainer.style.display = "none";
    progressBar.aria_valuenow = 0;
    progressBar.style.width = 0;
    progressBar.classList.remove("bg-success");
    let note = document.createElement("div");
    note.classList.add("alert");
    note.role = "alert";
    let globalMetadata = {}
    let detectedType = null;
    let hasMetadata = true;
    let hasPrimaryMetadata = true;
    let nestedFolders = false;
    if (response["primary_metadata"].length == 0) {
        hasMetadata = false;
        hasPrimaryMetadata = false;
        if (response["secondary_metadata_files"].length != 0) {
            hasMetadata = true;
        }
    }
    document.getElementById("form_run_uuid").value = response["run_uuid"];
    if (hasMetadata) {
        if (hasPrimaryMetadata) {
            detectedType = "raw-image"
            //console.log(response["primary_metadata"])
            for (let i = 0; i < response["primary_metadata"].length; i++) {
                if (response["primary_metadata"][i].hasOwnProperty("context")) {
                    let testStr = response["primary_metadata"][i]["context"];
                    if (testStr.includes("Imaging FlowCytobot")) {
                        detectedType = "ifcb";
                        try {
                            globalMetadata["sample_time"] = response["primary_metadata"][i]["sampleTime"]
                        } catch (e) {

                        }
                    }
                }
            }
        } else {
            detectedType = "raw-image";
        }
    } else {
        if (nestedFolders) {
            detectedType = "pre-classified";
        } else {
            detectedType = "raw-image";
        }
    }

    if (globalMetadata.hasOwnProperty("sample_time")) {
        document.getElementById("form_md_sample_time").value = globalMetadata["sample_time"];
    }
    //console.log(response);
    switch (detectedType) {
        case "ifcb":
            note.classList.add("alert-success");
            note.appendChild(document.createTextNode("Upload succeeded, IFCB data detected."));
            break;
        case "pre-classified":
            note.classList.add("alert-success");
            note.appendChild(document.createTextNode("Upload succeeded, detected pre-classified images, please verify extracted metadata."));
            break;
        case "raw-image":
        default:
            note.classList.add("alert-warning");
            note.appendChild(document.createTextNode("Upload succeeded, but could not auto-detect sensor type, please verify extracted metadata."));
    }
    setSensorType(detectedType);
    form.before(note);
}

let uploadFile = (then = () => {}, onError = () => {}, uri = "/upload") => {
    event.preventDefault();
    const method = 'post';
    const xhr = new XMLHttpRequest();
    const form = event.target.form;
    const fieldset = form.querySelector("fieldset");
    const data = new FormData(form);
    const progressBar = form.querySelector(".progress-bar");
    const spinnerContainer = form.querySelector(".spinner-container");
    fieldset.disabled = true;
    spinnerContainer.style.display = "";
    xhr.open(method, uri);
    xhr.addEventListener('loadend', () => {
        if (xhr.status === 200) {

            //modalAlert("Upload succeeded", "You should now continue to add metadata. It's possible to do this later.");
            progressBar.aria_valuenow = 0;
            progressBar.style.width = 0;


            //form.before(note);
            spinnerContainer.style.display = "none";
            then(form, JSON.parse(xhr.responseText));
        } else {
            onError(xhr.status);
            modalAlert("Upload failed", "Please try again");
            progressBar.aria_valuenow = 0;
            progressBar.style.width = 0;
            fieldset.disabled = false;
            spinnerContainer.style.display = "none";
        }
    });
    xhr.upload.addEventListener("progress", event => {
        //console.log(event.loaded)
        let perc = (event.loaded / event.total) * 100;
        //console.log(perc)

        if (perc > 99) {
            const progressBar = form.querySelector(".progress-bar");
            const spinnerContainer = form.querySelector(".spinner-container");
            spinnerContainer.style.display = "";
            progressBar.aria_valuenow = 100;
            progressBar.style.width = "100%";
            progressBar.classList.add("bg-success");
            spinnerContainer.querySelector(".spinner-container-text").innerText = " Extracting metadata...";
        } else {
            progressBar.aria_valuenow = perc;
            progressBar.style.width = perc + "%";
        }
        //console.log(progressBar)
    });
    xhr.send(data);
}