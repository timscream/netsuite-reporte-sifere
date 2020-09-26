/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/url', 'N/runtime', 'N/ui/message', 'N/https', 'N/currentRecord'], function (url,runtime,message,https,currentRecord) {
    // set Global Variables
    const dataMessage  = {};
    var searchCriteria = {};
    var request = {
        responseArray: []
        ,response: {}//will change in function runRequest()
        ,error: false//will change in function validateRequestError()
        ,messageError: ''//will change in function validateRequestError()
        ,resetChanges: function() { this.response = {}; this.error = false; this.messageError = '' }
    };
    var file = {
        name: [
             'Retenciones IIBB Sufridas- Original'
            ,'Retenciones IIBB Sufridas- Extra'
            ,'Retenciones con campos obligatorios vacios']
        ,extension: '.txt'
        ,period: []//will change in function generateBlob()
        ,blob: {}//will change in function generateBlob()
        ,resetChanges: function() { this.blob = {}; this.period = [] }
        ,fullName: function(i) { return this.name[i]+'_'+(+this.period[0]+1)+"_"+this.period[1]+this.extension }
    };
    // End set Global Variables

    function setConfigLang() {
        var lang = runtime.getCurrentUser().getPreference({ name: "LANGUAGE" }).split('_')[0];
        if (lang === 'es') {
            dataMessage.titleError = 'Error en la consulta';
            dataMessage.unknownRequestError = 'Error Desconocido, Consultar la Consola del navegador';
            dataMessage.emptyRequestResponse = 'El servidor respondió con un mensaje vacío';
        } else if (lang === 'en') {
            dataMessage.titleError = 'Error in request';
            dataMessage.unknownRequestError = 'Unknown Error, Check out the Browser Console';
            dataMessage.emptyRequestResponse = 'The server responded with an empty message';
        }
    }

    function clearMemory() {
        //limpiando la memoria
        request.resetChanges();
        file.resetChanges();
        searchCriteria = {};
    }

    function DownloadFile(blobFile,nameFile) {
        var reader = new FileReader();
        reader.onload = function (event) {
            var save = document.createElement('a');
            save.href = event.target.result;
            save.target = '_blank';
            save.download = nameFile;
            var clicEvent = new MouseEvent('click', {
                'view': window,
                    'bubbles': true,
                    'cancelable': true
            });
            save.dispatchEvent(clicEvent);
            (window.URL || window.webkitURL).revokeObjectURL(save.href);
        };
        reader.readAsDataURL(blobFile);
    }

    function generateBlob() {
        var data = String();
        file.period = searchCriteria.period.split("_");
        for(var i in request.responseArray){
            if(request.responseArray[i].hasOwnProperty('data')){
                data = request.responseArray[i].data;
                file.blob[i] = new Blob([data], {type: "text/plain"});
                DownloadFile(file.blob[i],file.fullName(i))
            }
        }
    }

    function displaySummary(){
        var tr = '';
        var pathCssTable="#qbt_sifere_report_summary_container .table > thead:nth-child(1)";
        for(var i in request.responseArray){
            if(request.responseArray[i].hasOwnProperty('uiMessage')){
                var uiMessage = request.responseArray[i].uiMessage;
                tr += '<tr><th>'+uiMessage+'</th></tr>';
            }
        }
        document.querySelector(pathCssTable).innerHTML = tr; 
    }

    function alertUserOfRequestError() {
        message.create({
            title: dataMessage.titleError,
            message: request.messageError, 
            type: message.Type.ERROR,
            duration: 20000
        }).show(); // will disappear after 20s
        console.error( 'Error RESTlet Response Details: ' + JSON.stringify(request.response))
    }

    function validateResponse() {
        if (request.response.hasOwnProperty('code') && request.response.code != 200) {
            request.messageError = dataMessage.unknownRequestError;
            request.error = true;
        } else if (request.response.hasOwnProperty('type') && request.response.type == 'error.SuiteScriptError') {
            request.messageError = request.response.message;
            request.error = true;
        } else if (request.response.hasOwnProperty('code') && request.response.code == 200) {
            if (request.response.hasOwnProperty('body') && request.response.body === '') {
                request.messageError = dataMessage.emptyRequestResponse;
                request.error = true;
            } else if (request.response.hasOwnProperty('body') && request.response.body != '') {
                //this is the only one condition with success response from Restlet
                //this here not need message or anything
                request.error = false;
                request.responseArray = JSON.parse(request.response.body);
            } else {
                //validar otro tipo de error desconocido
                request.messageError = dataMessage.unknownRequestError;
                request.error = true;
            }
        } else {
            //validar otro tipo de error desconocido
            request.messageError = dataMessage.unknownRequestError;
            request.error = true;
        }
    }

    function runRequest() {
        var urlReslet = url.resolveScript({
            scriptId: 'customscript_qbt_rl_withholding_sifere',
            deploymentId: 'customdeploy_qbt_rl_withholding_sifere',
            returnExternalUrl: false,
            params: searchCriteria
        });
        try{
            request.response = https.get({
                url: urlReslet
            });
        } catch (e) {
            request.response = e;
        }
    }

    function setParameters() {
        var current = currentRecord.get();

        //required
        searchCriteria.jurisdiction = current.getValue({ fieldId: 'custpage_jurisdiction' });
        searchCriteria.period       = current.getValue({ fieldId: 'custpage_period' });
        searchCriteria.company      = current.getValue({ fieldId: 'custpage_company' });

        //optionals
        //si la cuenta de Netsuite no tiene habilitada estas caracteristicas
        //los campos no existiran, entonces se valida para evitar un error
        searchCriteria.department   = current.getValue({ fieldId: 'custpage_department' }) || null;
        searchCriteria.class        = current.getValue({ fieldId: 'custpage_class' }) || null;
        searchCriteria.location     = current.getValue({ fieldId: 'custpage_location' }) || null;
    }

    function clearUiMessage() {
        if(document.querySelector("#div__alert")){
            document.querySelector("#div__alert").innerHTML = '';
        }

        document.querySelector("#qbt_sifere_report_summary_container .table > thead:nth-child(1)").innerHTML = '';
    }

    function clickSearchButton() {
        clearUiMessage()
        setParameters();
        runRequest();
        validateResponse();
        if(request.error) {
            alertUserOfRequestError();
        } else {
            displaySummary();
            generateBlob();
        }
        clearMemory();
    }

    function pageInit(context) {
        setConfigLang()
    }

    return {
        pageInit: pageInit,
        clickSearchButton: clickSearchButton
    }
});
