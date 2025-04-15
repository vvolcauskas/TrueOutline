//trueOutline.jsx v0.5

workDoc = app.documents[0];
exportDoc = app.documents["Export.ai"];


function deselect() {
    app.redraw(); //avoids errors
    app.executeMenuCommand("deselectall");
}


function selectAll(type) {
    if (type == "all") {
        selectAll("groups");
        selectAll("compoundPaths");
        selectAll("paths");
        selectAll("textFrames");
    }
    if (type == "groups") {
        var count = app.activeDocument.activeLayer.groupItems.length;
        for (item=0; item<count; item++) {
            if (app.activeDocument.activeLayer.groupItems[item].hidden == false) {
                app.activeDocument.activeLayer.groupItems[item].selected = true;
            }
        }
    }

    if (type == "compoundPaths") {
        var count = app.activeDocument.activeLayer.compoundPathItems.length;
        for (item=0; item<count; item++) {
            if (app.activeDocument.activeLayer.compoundPathItems[item].hidden == false) {
                app.activeDocument.activeLayer.compoundPathItems[item].selected = true;
            }
        }
    }

    if (type == "paths") {
        var count = app.activeDocument.activeLayer.pathItems.length;
        for (item=0; item<count; item++) {
            if (app.activeDocument.activeLayer.pathItems[item].hidden == false) {
                app.activeDocument.activeLayer.pathItems[item].selected = true;
            }
        }
    }

    if (type == "textFrames") {
        var count = app.activeDocument.activeLayer.textFrames.length;
        for (item=0; item<count; item++) {
            if (app.activeDocument.activeLayer.textFrames[item].hidden == false) {
                app.activeDocument.activeLayer.textFrames[item].selected = true;
            }
        }
    }
}

//--------------------setup exportDoc---------------------//
app.activeDocument = exportDoc;

//remove page items
app.executeMenuCommand("selectall");
count = exportDoc.selection.length;
for (i=0; i<count; i++) {
    exportDoc.selection[0].remove();
}

//remove layers
count = exportDoc.layers.length - 1;
for (i=0; i<count; i++) {
    exportDoc.layers[0].visible = true;
    exportDoc.layers[0].remove();
}

//create needed layers
var layerNames = ["WorkingDesign", "FinishedDesign", "Working", "OffsetFont", "FinishedFont"]
count = layerNames.length;
exportDoc.layers[0].name = layerNames[0]; //initial layer
for (i=1; i<count; i++) {
    newLayer = exportDoc.layers.add();
    newLayer.name = layerNames[i];
}



//-------------moving page items to exportDoc----------------//

//for renaming before export
var artNames = []; // Inv, MetalBack, Bck, MetalFront
var artColors = [];


app.activeDocument = workDoc;
for (layer=0; layer < workDoc.layers.length; layer++) {
    if (workDoc.layers[layer].visible == true) { //current layer is visible
        workDoc.activeLayer = workDoc.layers[layer];

        //dup art
        var count = workDoc.layers[layer].layers["Design"].groupItems.length;
        for (i=0; i<count; i++) {
            if (workDoc.layers[layer].layers["Design"].groupItems[i].hidden == false) {
                app.activeDocument = workDoc;
                deselect();
                redraw();

                workDoc.layers[layer].layers["Design"].groupItems[i].duplicate(exportDoc.layers["WorkingDesign"]);
                artNames.push(workDoc.layers[layer].layers["Design"].groupItems[i].name);
                artColors.push(workDoc.layers[layer].layers["Design"].groupItems[i].compoundPathItems[0].pathItems[0].fillColor); //WORKS
                /*
                if (workDoc.layers[layer].layers["Design"].groupItems[i].filled == true) {
                    artColors.push(workDoc.layers[layer].layers["Design"].groupItems[i].fillColor);
                    alert(workDoc.layers[layer].layers["Design"].groupItems[i].fillColor);
                }
                */
            }
        }


        //finding type of font (Font or FontInv)
        var fontType;
        try {
            if (workDoc.layers[layer].layers["Font"].visible == true) {
                fontType = "Font";
            }
        } catch (e) {
            // "Font" layer does not exist
        }

        try {
            if (workDoc.layers[layer].layers["Font2"].visible == true) {
                fontType = "Font2"
            }
        } catch (e) {
            // "Font" layer does not exist
        }

        try {
            if (workDoc.layers[layer].layers["FontInv"].visible == true) {
                fontType = "FontInv";
            }
        } catch (e) {
            // "FontInv" layer does not exist
        }

        //dup text
        var count = workDoc.layers[layer].layers[fontType].pageItems.length ;
        for (i=0; i<count; i++) {
            if (workDoc.layers[layer].layers[fontType].pageItems[i].hidden == false) {
                app.activeDocument = workDoc;
                deselect();
                redraw();

                workDoc.layers[layer].layers[fontType].pageItems[i].duplicate(exportDoc.layers["Working"]);
            }
        }
    }
}



//------------------------working with text and art-----------------------//

app.activeDocument = exportDoc;
exportDoc.activeLayer = exportDoc.layers["Working"];

//check if any text was dupped
var count = exportDoc.layers["Working"].pageItems.length;
if (count > 0) {
    //outline text
    var count = exportDoc.layers["Working"].textFrames.length;
    for (i=0; i<count; i++) {
        exportDoc.layers["Working"].textFrames[0].createOutline(); //textFrames are converted to compoundPaths in a group

        if (exportDoc.layers["Working"].groupItems[0].compoundPathItems[0].pathItems[0].stroked == true) {
            deselect();
            exportDoc.layers["Working"].groupItems[0].selected = true;
            app.doScript("outlineStroke", "trueOutline");
        }
    }

    //merge all text into 1 compound path
    selectAll("groups");
    try {
        app.doScript("add", "trueOutline"); //could be 1 compoundPath if all united, or mix of paths and compoundPaths in a group otherwise
    } catch (e) {}
    if (exportDoc.layers["Working"].compoundPathItems.length == 0) {
        app.doScript("makeCompoundPath", "trueOutline"); //no longer in a group
    }

    //text ready for export
    try {
        exportDoc.layers["Working"].compoundPathItems[0].duplicate(exportDoc.layers["FinishedFont"]);
    } catch (e) {
        exportDoc.layers["Working"].groupItems[0].duplicate(exportDoc.layers["FinishedFont"]);
    }

    //offset text
    deselect();
    app.redraw();

    try {
        exportDoc.layers["Working"].compoundPathItems[0].selected = true;
    } catch (e) {
        exportDoc.layers["Working"].groupItems[0].selected = true;
    }

    var offsetType;
    if (fontType == "Font") {
        offsetType = "offset";
    } else if (fontType == "Font2") {
        offsetType = "offset2"
    } else if (fontType == "FontInv") {
        offsetType = "offsetInv"
    }

	app.doScript(offsetType, "trueOutline"); //creates a compoundPath at end of layer, old text remains at start of layer

    //minus standard text
    selectAll();
    app.doScript("minusFront", "trueOutline"); //group type

    //move offset text
    try {
        exportDoc.layers["Working"].compoundPathItems[0].move(exportDoc.layers["OffsetFont"], ElementPlacement.PLACEATBEGINNING);
    } catch (e) {
        exportDoc.layers["Working"].groupItems[0].move(exportDoc.layers["OffsetFont"], ElementPlacement.PLACEATBEGINNING);
    }
}
//offset text is type compoundPath in OffsetFont layer


var layerOptions = {
    "Inv": { // NOT SWITCHING BETWEEN INV AND NORMAL TEXT????
        "addOffsetText": true, //Pathfinder Unite with offset text
        "addOffsetTextInv": false, //Pathfinder Unite with offset textInv
        "minusText": true, //PathFinder MinusFront with standard text
        "add": [], //PathFinder Unite for art in WorkingDesign
        "minus": [] //PathFinder MinusFront for art in WorkingDesign
    },
    "MetalBack": {
        "addOffsetText": false,
        "addOffsetTextInv": false,
        "minusText": true,
        "add": [],
        "minus": []
    },
    "Bck": {
        "addOffsetText": false,
        "addOffsetTextInv": true,
        "minusText": true,
        "add": [],
        "minus": []
    },
    "MetalFront": {
        "addOffsetText": false,
        "addOffsetTextInv": false,
        "minusText": true,
        "add": [],
        "minus": []
    },
    "MetalBack2": {
        "addOffsetText": false,
        "addOffsetTextInv": false,
        "minusText": true,
        "add": [],
        "minus": []
    },
    "MetalBack3": {
        "addOffsetText": false,
        "addOffsetTextInv": false,
        "minusText": true,
        "add": [],
        "minus": []
    },
    "MetalBack4": {
        "addOffsetText": false,
        "addOffsetTextInv": false,
        "minusText": true,
        "add": [],
        "minus": []
    },
    "MetalBack5": {
        "addOffsetText": false,
        "minusText": true,
        "add": [],
        "minus": []
    },
    "MetalBack6": {
        "addOffsetText": false,
        "addOffsetTextInv": false,
        "minusText": true,
        "add": [],
        "minus": []
    }
}

function workLayer(layer, options) {
    app.activeDocument = exportDoc;

    //moving current art to Working layer
    layer.duplicate(exportDoc.layers["Working"]);

    var fontOptionText;
    if (fontType != "FontInv") {
        fontOptionText = "addOffsetText"
    } else {
        fontOptionText = "addOffsetTextInv"
    }

    //---------------
    //minus
    toMinus = false;
    count = options["minus"].length;
    if (count>0) {
        toMinus = true;
    }
    for (i=0; i<count; i++) {
        try {
            exportDoc.layers["WorkingDesign"].groupItems[options["minus"][i]].duplicate(exportDoc.layers["Working"]);
        } catch (e) {
            //item does not exist in current doc
        }
    }
    
    if (options["minusText"] == true) { //minus standard text
        try {
            exportDoc.layers["FinishedFont"].compoundPathItems[0].duplicate(exportDoc.layers["Working"]);
            toMinus = true;
        } catch (e) {
            //no text visible
        }
    }

    if (options[fontOptionText] == false) { //minus offset text
        toMinus = true;
        try {
            exportDoc.layers["OffsetFont"].compoundPathItems[0].duplicate(exportDoc.layers["Working"]);
        } catch (e){
            try {
                exportDoc.layers["OffsetFont"].groupItems[0].duplicate(exportDoc.layers["Working"]);
            } catch (e) {
                //no text visible
            }
        }
    }
    
    app.redraw();
    exportDoc.activeLayer = exportDoc.layers["Working"];
    deselect();
    selectAll("all");
    if (toMinus == true) {
        app.doScript("minusFront", "trueOutline"); //check name of action
    }
    //---------------
    //add
    toAdd = false;
    count = options["add"].length;
    if (count > 0) {
        toAdd = true;
    }
    for (i=0; i<count; i++) {
        try {
            try {
                exportDoc.layers["WorkingDesign"].groupItems[options["add"][i]].duplicate(exportDoc.layers["Working"]); //find layer with same name and dup it to Working layer
            } catch (e) {
                exportDoc.layers["WorkingDesign"].compoundPathItems[options["add"][i]].duplicate(exportDoc.layers["Working"]);
            }
        } catch (e) {
            //item does not exist in current doc
        }
    }

    
    if (options[fontOptionText] == true) { //check if need to Unite with offset text
        toAdd = true;
        try {
            exportDoc.layers["OffsetFont"].compoundPathItems[0].duplicate(exportDoc.layers["Working"]);
        } catch (e){
            try {
                exportDoc.layers["OffsetFont"].groupItems[0].duplicate(exportDoc.layers["Working"]);
            } catch (e) {
                //no text visible
            }
        }
    }

    app.redraw();
    exportDoc.activeLayer = exportDoc.layers["Working"];
    deselect();
    selectAll("all"); //includes groups for art and compoundPaths for text

    if (toAdd == true) {
        app.doScript("add", "trueOutline");
    }

    //converting types
    deselect();
    exportDoc.layers["Working"].pageItems[0].selected = true;
    if (exportDoc.selection[0].typename != "compoundPathItem") {
        app.doScript("makeCompoundPath", "trueOutline");
        deselect();
        exportDoc.layers["Working"].compoundPathItems[0].selected = true;
        app.executeMenuCommand("group");
    }
    exportDoc.layers["Working"].groupItems[0].move(exportDoc.layers["FinishedDesign"], ElementPlacement.PLACEATBEGINNING);

}


workLayer(exportDoc.layers["WorkingDesign"].groupItems["Inv"], layerOptions["Inv"]);

//working layers
artCount = exportDoc.layers["WorkingDesign"].groupItems.length;
for (a=0; a<artCount; a++) {
    workLayer(exportDoc.layers["WorkingDesign"].groupItems[a], layerOptions[exportDoc.layers["WorkingDesign"].groupItems[a].name]);
}


//moving items
exportDoc.layers["OffsetFont"].remove();
exportDoc.layers["Working"].remove();
exportDoc.layers["WorkingDesign"].remove();
count = artNames.length;
for (i=0; i<count; i++) {
    newLayer = exportDoc.layers.add();
    exportDoc.layers[0].name = artNames[i];
    exportDoc.layers["FinishedDesign"].groupItems[0].compoundPathItems[0].pathItems[0].filled = true;
    exportDoc.layers["FinishedDesign"].groupItems[0].compoundPathItems[0].pathItems[0].fillColor = artColors[i];
    exportDoc.layers["FinishedDesign"].groupItems[0].compoundPathItems[0].pathItems[0].stroked = false;
    exportDoc.layers["FinishedDesign"].groupItems[0].move(exportDoc.layers[0], ElementPlacement.PLACEATBEGINNING); //unsure on layers[0] call
}
//merging layers
var layerOptions = {
    "Inv": {
        "merge": []
    },
    "MetalBack": {
        "merge": []
    },
    "Bck": {
        "merge": []
    },
    "MetalFront": {
        "merge": []
    },
    "MetalBack2": {
        "merge": []
    },
    "MetalBack3": {
        "merge": []
	},
    "MetalBack4": {
        "merge": []
	},
    "MetalBack5": {
        "merge": []
	},
    "MetalBack6": {
        "merge": []
	}
	
}
function mergeLayer (layer, options) { //layer = string name of layer
    count = options["merge"].length;
    if (count > 0) {
        deselect();
        for (i=0; i<count; i++) {
            try {
                exportDoc.layers[options["merge"][i]].groupItems[0].selected = true;
            } catch (e) {
                //alert(e);
                //layer does not exist in doc
            }
        }
        layer.groupItems[0].selected = true;
        app.doScript("makeCompoundPath", "trueOutline");
        
        /*
        //removing uneeded layers
        count = options["merge"].length;
        for (i=0; i<count; i++) {
            exportDoc.layers[options["merge"][i]].remove();
        }
        */
    }
}

exportDoc.layers["FinishedDesign"].remove();
exportDoc.layers["FinishedFont"].name = fontType; //rename for convenience
if (exportDoc.layers[fontType].pageItems.length == 0) {
    exportDoc.layers[fontType].remove(); //remove if no text was visible
}


app.redraw();

//layer names for easier referencing
countNames = [];
mergeCount = exportDoc.layers.length - 1; //Not include Font layer
for (i=0; i<mergeCount; i++) {
    countNames.push(exportDoc.layers[i].name);
}
for (m=0; m<mergeCount; m++) {
    try {
        mergeLayer(exportDoc.layers[countNames[m]], layerOptions[countNames[m]]);
    } catch (e) {
        alert(e);
        //layer was merged so doesn't exist anymore
    }
}

//cleanup empty layers
for (i=exportDoc.layers.length - 1; i>0; i--) { //work backwards to avoid sequencing errors
    if (exportDoc.layers[i].pageItems.length == 0) {
        exportDoc.layers[i].remove();
    }
}

deselect();