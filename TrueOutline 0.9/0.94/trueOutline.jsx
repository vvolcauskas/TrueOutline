//trueOutline.jsx v0.5

workDoc = app.documents[0];
exportDoc = app.documents["Export.ai"];


function deselect() {
    app.redraw(); //avoids errors
    app.executeMenuCommand("deselectall");
}

Array.prototype.indexOf = function ( item ) {
    var index = 0, length = this.length;
    for ( ; index < length; index++ ) {
        if ( this[index] === item ){
            return index;
        }
    }
    return -1;
};

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
const cookieCutterLayers = ["Template", "Template2"];


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
                if (cookieCutterLayers.indexOf(workDoc.layers[layer].layers["Design"].groupItems[i].name) == -1) { // item not used in final design
                    artNames.push(workDoc.layers[layer].layers["Design"].groupItems[i].name);
                    artColors.push(workDoc.layers[layer].layers["Design"].groupItems[i].compoundPathItems[0].pathItems[0].fillColor); //WORKS
                }
                /*
                if (workDoc.layers[layer].layers["Design"].groupItems[i].filled == true) {
                    artColors.push(workDoc.layers[layer].layers["Design"].groupItems[i].fillColor);
                    alert(workDoc.layers[layer].layers["Design"].groupItems[i].fillColor);
                }
                */
            }
        }


        //finding type of font (Font or FontInv)
        var availableFontTypes = ["Font", "Font2", "FontInv", "FontLine"];
        var fontType;
        for (i = 0; i < availableFontTypes.length; i++) {
            try {
                if (workDoc.layers[layer].layers[availableFontTypes[i]].visible == true) {
                    fontType = availableFontTypes[i];
                    break; // only allow 1 font type
                }
            } catch (e) {
                //layer does not exist
            }
        }
        if (fontType == "FontLine") {
            artNames.unshift("Line"); // add line to artNames for later
            artColors.unshift("Line"); // add line to artColors for later
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

    var availableOffsetTypes = {
        "Font": "offset",
        "Font2": "offset2",
        "FontInv": "offsetInv",
        "FontLine": "offset"
    }
    var offsetType = availableOffsetTypes[fontType];

	app.doScript(offsetType, "trueOutline"); //creates a compoundPath at end of layer, old text remains at start of layer

    //minus standard text
    selectAll();
    app.doScript("minusFront", "trueOutline"); // group type
    app.doScript("makeCompoundPath", "trueOutline"); // compoundPath type

    //move offset text
    try {
        exportDoc.layers["Working"].compoundPathItems[0].move(exportDoc.layers["OffsetFont"], ElementPlacement.PLACEATBEGINNING);
    } catch (e) {
        exportDoc.layers["Working"].groupItems[0].move(exportDoc.layers["OffsetFont"], ElementPlacement.PLACEATBEGINNING);
    }
}
//offset text is type compoundPath in OffsetFont layer

//-----------------------------------------------------------------------------------------------------------------------------------------------------------------

var layerOptions = {
    "Inv": { // NOT SWITCHING BETWEEN INV AND NORMAL TEXT????
        "cookieCutter": false, //Layer only used to adjust other layers, not used in final design
        "addOffsetText": true, //Pathfinder Unite with offset text
        "addOffsetTextInv": false, //Pathfinder Unite with offset textInv
        "minusText": true, //PathFinder MinusFront with standard text
        "add": [], //PathFinder Unite for art in WorkingDesign
        "minus": [] //PathFinder MinusFront for art in WorkingDesign
    },
    "MetalBack": {
        "cookieCutter": false,
        "addOffsetText": false,
        "addOffsetTextInv": false,
        "minusText": true,
        "add": [],
        "minus": []
    },
    "Bck": {
        "cookieCutter": false,
        "addOffsetText": false,
        "addOffsetTextInv": true,
        "minusText": true,
        "add": [],
        "minus": []
    },
    "MetalFront": {
        "cookieCutter": false,
        "addOffsetText": false,
        "addOffsetTextInv": false,
        "minusText": true,
        "add": [],
        "minus": []
    },
    "MetalBack2": {
        "cookieCutter": false,
        "addOffsetText": false,
        "addOffsetTextInv": false,
        "minusText": true,
        "add": [],
        "minus": []
    },
    "MetalBack3": {
        "cookieCutter": false,
        "addOffsetText": false,
        "addOffsetTextInv": false,
        "minusText": true,
        "add": [],
        "minus": []
    },
    "MetalBack4": {
        "cookieCutter": false,
        "addOffsetText": false,
        "addOffsetTextInv": false,
        "minusText": true,
        "add": [],
        "minus": []
    },
    "MetalBack5": {
        "cookieCutter": false,
        "addOffsetText": false,
        "minusText": true,
        "add": [],
        "minus": []
    },
    "MetalBack6": {
        "cookieCutter": false,
        "addOffsetText": false,
        "addOffsetTextInv": false,
        "minusText": true,
        "add": [],
        "minus": []
    },
    "Template": {
        "cookieCutter": true,
    },
    "Template2": {
        "cookieCutter": true,
    },
    "Line": {
        "cookieCutter": false,
        "ignoreoffsetText": true,
        "minusText": false,
        "add": [],
        "minus": []
    },
}

function workLayer(layer, options) {
    // check if layer is cookieCutter
    if (options["cookieCutter"] == true) {
        return;
    }

    app.activeDocument = exportDoc;

    //moving current art to Working layer
    layer.duplicate(exportDoc.layers["Working"]);

    var fontOptionText;
    if (fontType != "FontInv") {
        fontOptionText = "addOffsetText"
    } else if (fontType == "FontLine") {
        fontOptionText = "ignoreOffsetText"
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

    
    if (options[fontOptionText] == true && fontOptionText != "ignoreOffsetText") { //check if need to Unite with offset text
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

// fontLine type, remove top outline
if (fontType == "FontLine") {
    deselect();
    exportDoc.layers["OffsetFont"].compoundPathItems[0].selected = true;

    exportDoc.layers["WorkingDesign"].groupItems.getByName("Template2").duplicate(exportDoc.layers["OffsetFont"]);
    exportDoc.layers["OffsetFont"].groupItems.getByName("Template2").selected = true;

    app.doScript("minusFront", "trueOutline");

    // check each vertex of each path to find bottom outline
    var countPath = exportDoc.layers["OffsetFont"].groupItems[0].pageItems.length;
    var paths = exportDoc.layers["OffsetFont"].groupItems[0].pageItems;
    var lowestAnchors = [];
    for (i = 0; i < countPath; i++) {
        if (paths[i].typename == "CompoundPathItem") {
            for (f=0; f<paths[i].pathItems.length; f++) {
                var countPoints = paths[i].pathItems[f].pathPoints.length;
                for (j = 0; j < countPoints; j++) {
                    if (paths[i].pathItems[f].pathPoints[j].anchor[1] < lowestAnchors[i] || lowestAnchors[i] == undefined) { // higher y = lower on screen
                        lowestAnchors[i] = paths[i].pathItems[f].pathPoints[j].anchor[1];
                    }
                }
            }
        } else {
            var countPoints = paths[i].pathPoints.length;
            for (j = 0; j < countPoints; j++) {
                if (paths[i].pathPoints[j].anchor[1] < lowestAnchors[i] || lowestAnchors[i] == undefined) { // higher y = lower on screen
                    lowestAnchors[i] = paths[i].pathPoints[j].anchor[1];
                }
            }
        }
        
    }

    // find highest vertex
    var highestAnchor = 0;
    for (i = 0; i < countPath; i++) {
        if (lowestAnchors[i] < lowestAnchors[highestAnchor]) {
            highestAnchor = i;
        }
    }

    // remove all but highest vertex
    for (i = countPath - 1; i >= 0; i--) { //work backwards to avoid sequencing errors
        if (i != highestAnchor) {
            exportDoc.layers["OffsetFont"].groupItems[0].pageItems[i].remove();
        }
    }

    // copy to art layer
    exportDoc.layers["OffsetFont"].groupItems[0].name = "Line";
    exportDoc.layers["OffsetFont"].groupItems[0].duplicate(exportDoc.layers["WorkingDesign"]);

    // add original text to offset for workLayer()
    exportDoc.layers["FinishedFont"].compoundPathItems[0].duplicate(exportDoc.layers["OFfsetFont"]);
    deselect();
    exportDoc.layers["OffsetFont"].groupItems[0].selected = true;
    exportDoc.layers["OffsetFont"].compoundPathItems[0].selected = true;
    app.doScript("add", "trueOutline");

    // fix bad overlap from pathfinder add
    app.doScript("fixOffset", "trueOutline");
    exportDoc.layers["OffsetFont"].compoundPathItems[0].remove();
}

//working layers
artCount = exportDoc.layers["WorkingDesign"].groupItems.length;
for (a=0; a<artCount; a++) {
    workLayer(exportDoc.layers["WorkingDesign"].groupItems[a], layerOptions[exportDoc.layers["WorkingDesign"].groupItems[a].name]);
}

// fontLine type, remove sides
artCount = exportDoc.layers["WorkingDesign"].groupItems.length - 2; // 2 templates
if (fontType == "FontLine") {
    // art layers
    for (i = 0; i < artCount; i++ ) {
        // if (exportDoc.layers["WorkingDesign"].groupItems[i].name != "Line") {
        //     continue; //skip line layer
        // }
        redraw();
        deselect();
        exportDoc.layers["FinishedDesign"].groupItems[i].move(exportDoc.layers["Working"], ElementPlacement.PLACEATBEGINNING);
        exportDoc.layers["Working"].groupItems[0].selected = true;

        exportDoc.layers["WorkingDesign"].groupItems.getByName("Template").duplicate(exportDoc.layers["Working"]);
        exportDoc.layers["Working"].groupItems.getByName("Template").selected = true;
        
        redraw();
        app.doScript("minusFront", "trueOutline"); //minus template from text

        // convert to compoundPath in group
        deselect();
        exportDoc.layers["Working"].pageItems[0].selected = true;
        app.doScript("makeCompoundPath", "trueOutline");
        deselect();
        exportDoc.layers["Working"].compoundPathItems[0].selected = true;
        app.executeMenuCommand("group");
        exportDoc.layers["Working"].groupItems[0].move(exportDoc.layers["FinishedDesign"], ElementPlacement.PLACEATBEGINNING);
    }

    // font layer
    redraw();
    deselect();
    exportDoc.layers["FinishedFont"].compoundPathItems[0].move(exportDoc.layers["Working"], ElementPlacement.PLACEATBEGINNING);
    exportDoc.layers["Working"].compoundPathItems[0].selected = true;

    exportDoc.layers["WorkingDesign"].groupItems.getByName("Template").duplicate(exportDoc.layers["Working"]);
    exportDoc.layers["Working"].groupItems.getByName("Template").selected = true;
    
    redraw();
    app.doScript("minusFront", "trueOutline"); //minus template from text

    exportDoc.layers["Working"].compoundPathItems[0].move(exportDoc.layers["FinishedFont"], ElementPlacement.PLACEATBEGINNING);
}
stop()
//moving items
exportDoc.layers["OffsetFont"].remove();
exportDoc.layers["Working"].remove();
exportDoc.layers["WorkingDesign"].remove();
count = artNames.length;
for (i=0; i<count; i++) {
    newLayer = exportDoc.layers.add();
    exportDoc.layers[0].name = artNames[i];
    exportDoc.layers["FinishedDesign"].groupItems[0].compoundPathItems[0].pathItems[0].filled = true;
    // check if fontLine is used
    if (artNames[i] == "Line") {
        deselect();
        exportDoc.layers["FinishedDesign"].groupItems[0].selected = true;
        app.doScript("colorLine", "trueOutline");
    } else {
        exportDoc.layers["FinishedDesign"].groupItems[0].compoundPathItems[0].pathItems[0].fillColor = artColors[i];
    }
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
	},
	"Template": {
        "merge": []
    },
    "Template2": {
        "merge": []
    },
    "Line": {
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