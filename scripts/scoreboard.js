
document.getElementById('instructions').addEventListener('click', function () {
    this.classList.toggle('active');
});

const SKYHANNI = "skyhanni"
const CUSTOM_SCOREBOARD = "custom-scoreboard"

let selectedMod = CUSTOM_SCOREBOARD;

const toggle = (button) => {
    const elements = document.getElementsByClassName("mod-button")
    selectedMod = button
    const id = `${button}-button`

    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];

        if (element.id === id) {
            element.classList.add("selected")
        } else {
            element.classList.remove("selected")
        }
    }
}

document.getElementById('custom-scoreboard-button').addEventListener('click', () => {
    toggle(CUSTOM_SCOREBOARD)
});

document.getElementById('skyhanni-button').addEventListener('click', () => {
    toggle(SKYHANNI)
});

const parameters = new URLSearchParams(window.location.search);

if (parameters.has("mod", "cs") || parameters.has("mod", "custom-scoreboard")) {
    toggle(CUSTOM_SCOREBOARD)
} else if (parameters.has("mod", "sh") || parameters.has("mod", "skyhanni")) {
    toggle(SKYHANNI)
}


const createPackButton = document.getElementById("createZip");
const fileInput = document.getElementById("fileInput");

fileInput.addEventListener('change', () => {
    const fileList = fileInput.files;
    if (!fileList[0].type.startsWith("image/")) {
        alert("Please select an image file.");
        return
    }

    createPackButton.hidden = fileList.length === 0;
});

createPackButton.addEventListener("click", () => {
    if (fileInput.files.length === 0) {
        alert('Please select an image file.');
        return;
    }

    const file = fileInput.files[0];
    const fileReader = new FileReader();

    fileReader.onload = (event) => {
        if (file.type !== "image/png") {
            const img = new Image()
            img.src = event.target.result;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                generateZip(canvas.toDataURL('image/png'));
            }
        } else generateZip(event.target.result);
    };

    fileReader.readAsDataURL(file);
});

const minFormat = 1;
const maxFormat = 1;

const generateZip = async (scoreboardImage) => {
    const meow = await fetch(`public/logos/${selectedMod}.png`)
    const packMeta = JSON.stringify({
        pack: {
            supported_formats: {
                min_inclusive: minFormat,
                max_inclusive: maxFormat
            },
            min_format: minFormat,
            max_format: [minFormat, 0],
            description: "§eCustom Scoreboard Background"
        }
    }, null, 2);

    const zip = new JSZip();
    zip.file("pack.mcmeta", packMeta);
    if (meow.status === 200) {
        zip.file("pack.png", meow.blob())
    }

    // Create assets directory structure and add the selected PNG
    const assetsFolder = zip.folder("assets");
    const textureFolder = assetsFolder.folder(selectedMod.replace("-", ""));
    textureFolder.file("scoreboard.png", scoreboardImage.split(',')[1], { base64: true });

    // Generate the zip and trigger download
    zip.generateAsync({ type: "blob" })
        .then((content) => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(content);
            a.download = 'Custom Scoreboard Background.zip';
            a.click();
            a.remove();
        });
}
