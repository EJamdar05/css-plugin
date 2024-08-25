//index.js: acts like a background script by sending messages to content.js
//for each appropraite button

//attaching click event listener to every button in index.html
document.getElementById("toggle").addEventListener("click", ()=>{
    //query for the active tab in the viewport
    browser.tabs.query({active: true, currentWindow: true}, (tabs)=>{
        //send the toggle command to the active tab
        browser.tabs.sendMessage(tabs[0].id, "toggle");
    })
})

document.getElementById("save").addEventListener("click", ()=>{
    browser.tabs.query({active: true, currentWindow: true}, (tabs)=>{
        //send the save command to the active tab
        browser.tabs.sendMessage(tabs[0].id, "save");
    })
})

document.getElementById("load").addEventListener("click", ()=>{
    browser.tabs.query({active: true, currentWindow: true}, (tabs)=>{
        //send the load command to the active tab
        browser.tabs.sendMessage(tabs[0].id, "load");
    })
 })

 document.getElementById("clear").addEventListener("click", ()=>{
    browser.tabs.query({active: true, currentWindow: true}, (tabs)=>{
        //send the clear command to the active tab
        browser.tabs.sendMessage(tabs[0].id, "clear");
    })
 })

 document.getElementById("switch").addEventListener("click", ()=>{
    browser.tabs.query({active: true, currentWindow: true}, (tabs)=>{
        //send the switch command to the active tab
        browser.tabs.sendMessage(tabs[0].id, "switch");
    })
 })
