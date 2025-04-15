/*
 * File: trueOutline.jsx
 * Description: Bespoke Illustrator script to create tag designs.
 * Author: V 
 * Created On: 15-04-2025
 * Version: 1.0
 */


// global variables
var workDoc = app.documents[0];
var exportDoc = app.documents["Export.ai"];


// general purpose functions for creating designs
Array.prototype.indexOf = function ( item ) {
    /*
    Returns the index of the first occurrence of item in the array, or -1 if not found.
    */

    var index = 0, length = this.length;
    for ( ; index < length; index++ ) {
        if ( this[index] === item ){
            return index;
        }
    }
    return -1;
};


function selectAll(type, layer) {
    /*
    Select all items of a specific type in given layer

    type - string
        "all" - select all items in layer
        "group" - select all groups in layer
        "compoundPath" - select all compound paths in layer
        "path" - select all paths in layer
        "textFrame" - select all text frames in layer
        "page" - select all page items in layer

    layer - layer
        e.g: app.activeDocument.layers[0]

    note: this function will not select hidden items
    */

    if (type == "all") {
        selectAll("group");
        selectAll("compoundPath");
        selectAll("path");
        selectAll("textFrame");
        selectAll("page")

    } else if (type == "group") {
        var count = layer.groupItems.length;
        for (item=0; item<count; item++) {
            if (layer.groupItems[item].hidden == false) {
                layer.groupItems[item].selected = true;
            }
        }

    } else if (type == "compoundPath") {
        var count = layer.compoundPathItems.length;
        for (item=0; item<count; item++) {
            if (layer.compoundPathItems[item].hidden == false) {
                layer.compoundPathItems[item].selected = true;
            }
        }

    } else if (type == "path") {
        var count = layer.pathItems.length;
        for (item=0; item<count; item++) {
            if (layer.pathItems[item].hidden == false) {
                layer.pathItems[item].selected = true;
            }
        }

    } else if (type == "textFrame") {
        var count = layer.textFrames.length;
        for (item=0; item<count; item++) {
            if (layer.textFrames[item].hidden == false) {
                layer.textFrames[item].selected = true;
            }
        }

    }else if (type == "page") {
        var count = layer.pageItems.length;
        for (item=0; item<count; item++) {
            if (layer.pageItems[item].hidden == false) {
                layer.pageItems[item].selected = true;
            }
        }
    }
}


function deselect() {
    /*
    Deselects all items in the active document
    */

    app.redraw(); //avoids errors
    app.executeMenuCommand("deselectall");
}


function setup() {
    /*
    Prepares the export doc for creating design and returns data for design.
    Art items are copied to "WorkingDesign" layer.
    Text items are copied to "Working" layer.

    returns:
        selectedDesign - string name of design
        artNames - array of strings for design items
        artColors - array of RGB colors of design items

    note: this function will not work as intended if any items in export doc are hidden.
    */

    app.activeDocument = exportDoc;
    var artnames = new Array();
    var artcolors = new Array();
    var selectedDesign = null;

    // exluded items, these are not used in the final design of tags
    var excludedItems = ["Template", "Template2"]

    // remove page items
    app.executeMenuCommand("selectall");
    count = exportDoc.selection.length;
    for (i=0; i<count; i++) {
        exportDoc.selection[0].remove();
    }

    // remove layers
    count = exportDoc.layers.length - 1;
    for (i=0; i<count; i++) {
        exportDoc.layers[0].visible = true;
        exportDoc.layers[0].remove();
    }

    // create layers
    var layerNames = ["WorkingDesign", "FinishedDesign", "Working", "OffsetFont", "FinishedFont"]
    count = layerNames.length;
    exportDoc.layers[0].name = layerNames[0];
    for (i=1; i<count; i++) {
        newLayer = exportDoc.layers.add();
        newLayer.name = layerNames[i];
    }

    // find selected design
    var designs = workDoc.layers;
    for (i = 0; i < designs.length; i++) {
        if (designs[i].visible == true) {
            selectedDesign = designs[i].name;
        }
    }

    // handle no selected design
    if (selectedDesign == null) {
        alert("No available designs.");
        return selectedDesign, artNames, artColors;
    }

    // copy art and text items to export doc
    app.activeDocument = workDoc;
    workDoc.activeLayer = workDoc.layers[selectedDesign];
    for (let i = 0; i < workDoc.layers[selectedDesign].layers["Design"].groupItems.length; i++) { // art items
        var artItem = workDoc.layers[selectedDesign].layers["Design"].groupItems[i];
        if (artItem.hidden == false) {
            deselect();
            redraw(); // avoids errors
            artItem.duplicate(exportDoc.layers["WorkingDesign"], ElementPlacement.PLACEATFRONT);

            // add item's name and color to return arrays
            artItemName = artItem.name;
            if (excludedItems.indexOf(artItemName) == -1) {
                artnames.push(artItemName);
                artcolors.push(artItem.compoundPathItems[0].fillColor); // group item does not have fill color
            }
        }
    }

    for (let i = 0; i < workDoc.layers[selectedDesign].layers["Font"].pageItems.length; i++) { // text items
        var artItem = workDoc.layers[selectedDesign].layers["Font"].pageItems[i];
        if (artItem.hidden == false) {
            deselect();
            redraw(); // avoids errors
            artItem.duplicate(exportDoc.layers["Working"], ElementPlacement.PLACEATFRONT);
        }
    }

    return selectedDesign, artNames, artColors;
}


function outlineText() {
    /*
    Outlines all text items in the export doc and merges into 1 compound path.
    */

    app.activeDocument = exportDoc;

    // outline text
    for (i = 0; i < exportDoc.layers["Working"].textFrames.length; i++) {
        var textItem = exportDoc.layers["Working"].textFrames[i];
        textItem.createOutline(); // return as group item

        // deselect();
        // textItem.selected = true;
        // app.doScript("Outline Stroke", "OutlineText");
    }

    // merge into 1 compound path
    exportDoc.activeLayer = exportDoc.layers["Working"];
    selectAll("group", exportDoc.layers["Working"]);
    try {
        // mix of compound paths and paths - need to unite
        app.doScript("add", "OutlineText"); // return group item
    } catch (e) {
        // all already united as 1 compound path, in a group item
    }

    if (exportDoc.layers["Working"].compoundPathItems.length > 0) {
        app.doScript("makeCompoundPath", "OutlineText");
    }
}


function offsetText() {
    /*
    Offsets the text in the export doc and merges into 1 compound path.
    */

    app.activeDocument = exportDoc;

    // offset text
    for (i = 0; i < exportDoc.layers["Working"].compoundPathItems.length; i++) {
        var textItem = exportDoc.layers["Working"].compoundPathItems[i];
        textItem.selected = true;
        app.doScript("Offset", "OutlineText");
    }

    // merge into 1 compound path
    exportDoc.activeLayer = exportDoc.layers["Working"];
    selectAll("group", exportDoc.layers["Working"]);
    try {
        // mix of compound paths and paths - need to unite
        app.doScript("add", "OutlineText"); // return group item
    } catch (e) {
        // all already united as 1 compound path, in a group item
    }

    if (exportDoc.layers["Working"].compoundPathItems.length > 0) {
        app.doScript("makeCompoundPath", "OutlineText");
    }
}