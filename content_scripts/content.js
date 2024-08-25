/*
currentAppliedStyles: keeps track of elements with their inline style
applied via the app. Used primarily with reverting styles on the flu
isTurnedOn: boolean to control toggling the "Observe Original" button
*/
currentAppliedStyles = new Map(); 
let isTurnedOn = false;
let isVisible = false;

/*
Listen for messages sent from the plugin button eventListeners
*/
browser.runtime.onMessage.addListener((request)=>{
    //toggle: toggles the empty element plane on the current webpage
    if(request === "toggle"){
        togglePanel();
    //save: save applied in-line styles
    }else if(request === "save"){
        saveStylesToLocalStorage();
    //load: load in-line styles from local storage
    }else if(request === "load"){
        loadStylesFromLocalStorage();
    //clear: clear the entry currently in localstorage
    }else if(request === "clear"){
        clearLocalStorage();
    //switch: toggle to original style on the fly
    }else if (request === "switch"){
        disableInLine();
    }
})

/*
togglePannel(): creates a panel if it does not exist on the page
and if it does, simply toggle the panel on and off if the "Inspect Element"
button is pressed
*/
function togglePanel(){
    //get the panel element
    let panel = document.getElementById('panel');

    //place it on the page if it does not exist
    if (!panel) {
        panel = document.createElement('div'); //create the div element
        panel.id = 'panel'; //assign id 
        panel.textContent = "Click on any element on the screen to add/edit styles"
        document.body.appendChild(panel); //append to the page
    } 

    //prevent content script from running when not in use
    //to save memory
    if(isVisible){
        panel.style.display = "none";
        isVisible = false;
        document.removeEventListener("click", presentPropertiesOnPanel, true);
    }else{
        panel.style.display = "block";
        isVisible = true;
        document.addEventListener("click", presentPropertiesOnPanel, true);
    }
    
}

/*
saveStylesToLocalStorage(): get all elements with the style attribute and save 
it to local storage.
*/
function saveStylesToLocalStorage(){
    try{
        //get all elements of the page
        const elements = document.getElementsByTagName("*");
        //object to contain all elements with the style attribute
        const styles = {};

        //loop through the elements
        for(let element of elements){
            //check if the current element has the style attribute
            const currentElement = element.getAttribute("style");
            if(currentElement){
                //get a selector name (id based, class based or custom)
                let selectorName = generateSelectorName(element);
                //check for a selector name if applied (filter failed elements)
                if(selectorName){
                    //populate the object with: <selector-name>:<style attr>
                    styles[selectorName] = currentElement;
                    console.log("Saved to dictionary");
                }else{
                    console.log("Could not save for element" + element);
                }
            }
        }

        //convert styles object to JSON
        const data = JSON.stringify(styles);
        //save data to localStorage via customStyles
        localStorage.setItem("customStyles", data);
        alert("Custom styles saved to localstorage");
    }catch(error){
        console.log("Could not save element: "+error);
    }
}

/*
loadStylesFromLocalStorage(): load the styles from localstorage and apply the
styles to the saved styles
*/
function loadStylesFromLocalStorage(){
    try{
        //convert the JSON object to a JavaScript object
        const styles = JSON.parse(localStorage.getItem("customStyles"));

        //loop through all the saved styles
        for(let style in styles){
            //find elements that match the selector name
            let elements = document.querySelectorAll(style)
            //loop through the matched elements and apply the inline style 
            //associated with the selector name
            for(let element of elements){
                element.setAttribute("style", styles[style]);
            }
        }
        alert("Loaded styles from localstorage successfully");
    }catch(error){
        console.log("Could not load from localstorage: "+error);
    }
}

/*
generateSelectorName(element): take in an element and 
generate a unique name to associate with the in-line style.
Used for storing and associating elements with custom styles.
returns a css path
Solution adapted from https://stackoverflow.com/questions/3620116/get-css-path-from-dom-element
*/
function generateSelectorName(element){
    //path: contains path towards an element (needed for specificity)
    let path = [];
    let currentElement = element;

    //loop through all DOM elements
    while (currentElement !== document.body && currentElement.parentNode) {
        //current selector of the DOM element (if applicable)
        let selector = currentElement.tagName.toLowerCase();
        //if an id exists for the currentElement, break out 
        if(currentElement.id) {
            selector += "#"+currentElement.id;
            path.unshift(selector);
            break;  
        }

        //if the current element has a class and the class name is of type string
        if(currentElement.className && typeof currentElement.className === 'string') {
            //split if multiple classes exist by space and seperate by . for each class
            let classString = currentElement.className.split(/\s+/).filter(Boolean).join('.');
            selector += "."+ classString;
            path.unshift(selector);
        }else{
            //get the index of the element (no id or class exist for it)
            let index = 1
            //get the sibbling elements
            let sibbling = currentElement.previousElementSibling
            //loop through sibblings
            while(sibbling){
                //check for previous tags that match the current html tag (get the count)
                if(sibbling.tagName.toLowerCase() === currentElement.tagName.toLowerCase()){
                    index++
                }
                sibbling = sibbling.previousElementSibling;
            }
            //indicate the nth element index with the selector
            selector += ":nth-of-type("+index+")";
            path.unshift(selector);
        }
        currentElement = currentElement.parentNode;
    }
    return path.join(">");
}

//event listener on the page for any clicked elements
function presentPropertiesOnPanel(event){
    //only dispay if the panel has been toggled
    const panel = document.getElementById("panel")
    if(panel.contains(event.target) || !panel){
        return;
    }

    //get the clicked element and save the applied styles
    const clickedElement = event.target;
    const cssProperties = returnCssElements(clickedElement);

    //clear panel of other css attributes
    panel.innerHTML = "";
    //div to contain the applied elements
    const elementSection = document.createElement("div");
    //display the tag name selected
    elementSection.textContent = "Clicked Tag: "+event.target.tagName;
    //append the div to the panel
    panel.appendChild(elementSection);
    //unordered list for applied styles
    const listContainer = document.createElement("ul");

    //loop through the applied css styles
    for(const [key, value] of Object.entries(cssProperties)){
        //create the list element
        let listElement = document.createElement("li");
        //make sure css property has a value attached
        if(value != ""){
            //create the checkbox and append to the unordered list
            let checkBox = createCheckbox(key, value, false, clickedElement);
            listElement.append(checkBox)
            listContainer.appendChild(listElement);
        }
    }

    //add button to add additional styles not listed
    let addBtn = document.createElement("button")
    addBtn.innerText = "Add Style"
    addBtn.id = "add-btn"
    panel.appendChild(addBtn)

    //button listener for the add button
    addBtn.addEventListener("click", ()=>{
        //add empty style attribute to be enabled and used
        let addedElem = document.createElement("li");
        addedElem.append(createCheckbox("empty", "empty", false, clickedElement))
        //append the added style to the list container
        listContainer.appendChild(addedElem)
        //smooth scroll to the added element
        addedElem.scrollIntoView({ behavior: 'smooth' })
        
    })

    //append the list to the container
    panel.appendChild(listContainer);
    //prevent normal browser behavior when element is clicked
    event.preventDefault();
    event.stopPropagation();

}

/*
createCheckbox(key, value, isChecked, clickedElement)
key: css property
value: css property value
isChecked: deprecated (NOT IN USE)
clickedElement: DOM element that was clicked

creates a checkbox for the css property
by having two text inputs (to edit the prop/value)
along with a checkmark attached

also contains event listeners to change styles
*/
function createCheckbox(key, value, isChecked, clickedElement){

    //create a new checkbox and disable it by default
    let checkBoxElement = document.createElement("input");
    checkBoxElement.type = "checkbox";
    checkBoxElement.id = key;
    checkBoxElement.checked = false;

    //create the textarea for the CSS property value
    let property = document.createElement("input");
    property.type = "text";

    //if function was passed "empty" for value,
    //add empty value and display hint
    if(value == "empty"){
        property.value = "";
        property.placeholder = "Enter property value"
    }else{
        //set the value of text input if not empty
        property.value = value;
    }
    //disable the css property from being edited by default 
    property.disabled = true;

    //labelElement: text input for the css property 
    let cssValue = document.createElement("input");
    cssValue.type = "text"

    //apply hint if key is "empty"
    if(key == "empty"){
        cssValue.value = ""
        cssValue.placeholder = "Enter CSS Property"
    }else{
        //set css property
        cssValue.value = key
    }

    //disable the text area by default 
    cssValue.disabled = true;

    //see if the checkbox for an applied style element had been toggled
    checkBoxElement.addEventListener('change', function(){
        //turn off the style
        if(this.checked){
            clickedElement.style.setProperty(key, property.value);
            property.disabled = false;
            cssValue.disabled = false;
            currentAppliedStyles.set(clickedElement, clickedElement.style.cssText);
        //turn it back on
        }else{
            clickedElement.style.removeProperty(key);
            property.disabled = true;
            cssValue.disabled = true;
            currentAppliedStyles.delete[clickedElement]
        }
    })

    //change the css property value 
    property.addEventListener("input", function(){
        if(checkBoxElement.checked){
            clickedElement.style.setProperty(cssValue.value, this.value);
            currentAppliedStyles.set(clickedElement, clickedElement.style.cssText)          
        }
    })

    //change the css property name
    cssValue.addEventListener("input", function(){
        if(checkBoxElement.checked){
            clickedElement.style.removeProperty(key)
            key = this.value
            clickedElement.style.setProperty(key, property.value)
            currentAppliedStyles.set(clickedElement, clickedElement.style.cssText)
        }
    })

    //append the container with the checkboxes, the cssProperty
    //name text area and the cssProperty value text area
    //and return the container
    let container = document.createElement("div");
    container.appendChild(checkBoxElement);
    container.appendChild(cssValue);
    container.appendChild(property);
    return container;
}



//returnCssElements (element)
//element: DOM element selected
//loop through style sheet and save their values
//to an object
function returnCssElements(element){
    let pageStyles = {}; //holds applied styles to clicked element
    //loop through the style sheets of the document
    for(let sheet of document.styleSheets){
        //error handling for styles that cannot be parsed
        try{
            //check if the selected element's selector matches the rule's
            //selector
            for(let rule of sheet.cssRules){
                if(element.matches(rule.selectorText)){
                    //loop through the styles of the rule and append to the
                    //pageStyles object
                    for(let style of rule.style){
                        pageStyles[style] = rule.style[style]
                    }
                }
            }
        }catch(error){
            console.log("Could not get inline elemenets: "+error)
        }
    }
    return pageStyles;
}

//clear the localStorage of saved styles and force reload the page
function clearLocalStorage(){
    localStorage.removeItem("customStyles")
    currentAppliedStyles.clear()
    window.location.reload()
}

//disableInLine(): toggle back to original style and switch back when necessary
function disableInLine(){
    if (!isTurnedOn) {
        currentAppliedStyles.forEach((styles, elem) => {
            elem.style.cssText = "";
        });
        isTurnedOn = true;
    } else {
        currentAppliedStyles.forEach((styles, elem) => {
            elem.style.cssText = styles;
        });
        isTurnedOn = false;
    }
}

