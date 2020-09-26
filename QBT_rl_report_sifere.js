/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search','N/runtime','N/log','N/record','./QBT_lib_common.js','N/format'], function (search,runtime,log,record,qbt_lib_common,format) {
    // beginning Req. 0056
    const dataMessage = {};
    var globalQbtJurisdictions = {
         filtersSearch : []
        ,resultSearch  : { listOnlyIds : [] }
    };
    var globalPaymentMethodsWithQbtJurisdiction = {
         filtersSearch : []
        ,resultSearch  : { listOnlyIds : [] }
    };
    var globalCustomerPayments = {
         filtersSearch : []
        ,resultSearch  : []
    };
    var outputResponse = {
         sectionExtra    : '' //will change in function generateTxt()
        ,sectionOriginal : '' //will change in function generateTxt()
        ,sectionEmptyField : '' //will change in function generateTxt()
        ,returnResultsInJSONStringify : function(){
            var returnArray = [];
            switch (this.sectionOriginal.length){
                case 0:
                    returnArray.push({uiMessage: dataMessage.noResultsForOriginalReport})
                    break;
                default:
                    returnArray.push({data: this.sectionOriginal})
            }
            switch (this.sectionExtra.length){
                case 0:
                    returnArray.push({uiMessage: dataMessage.noResultsForExtraReport})
                    break;
                default:
                    returnArray.push({data: this.sectionExtra})
            }
            switch (this.sectionEmptyField.length){
                case 0:
                    break;
                default:
                    returnArray.push({uiMessage:dataMessage.withholdingsWithEmptyFields, data: this.sectionEmptyField})
            }
            return JSON.stringify(returnArray);
        }
    };
    // End Req. 0056

    /* Req. 0056 */
    function setConfigLang(){
        var lang = runtime.getCurrentUser().getPreference({name: "LANGUAGE"}).split('_')[0];
        if(lang === 'es'){
            dataMessage.wrongSubsidiaryParameterFormat   = 'formato de parámetro subsidiaria incorrecto.';
            dataMessage.wrongPeriodParameterFormat       = 'formato de parámetro período incorrecto.';
            dataMessage.wrongJurisdictionParameterFormat = 'formato de parámetro jurisdicción incorrecto.';
            dataMessage.noSearchResultsMethPayWithJuris  = 'No se encontraron métodos de pago asociados a las jurisdicciones seleccionadas o, no estan activas.';
            dataMessage.noSearchResultsJurisdiction      = 'No seleccionó una Jurisdicción o no se encontraron Jurisdicciones Activas.';
            dataMessage.noSearchResultsCustomerPayment   = 'No hay retenciones para los criterios seleccionados.';
            dataMessage.noResultsForOriginalReport       = 'no hubo resultados para el reporte original.';
            dataMessage.noResultsForExtraReport          = 'no hubo resultados para el reporte extra.';
            dataMessage.withholdingsWithEmptyFields      = 'algunas retenciones no fueron incluidas debido a la presencia de campos vacíos, se genera un archivo TXT con la información'
        }
        else if(lang === 'en'){
            dataMessage.wrongSubsidiaryParameterFormat   = 'wrong subsidiary parameter format.';
            dataMessage.wrongPeriodParameterFormat       = 'wrong period parameter format.';
            dataMessage.wrongJurisdictionParameterFormat = 'wrong jurisdiction parameter format.';
            dataMessage.noSearchResultsMethPayWithJuris  = 'No payment methods were found associated to the selected jurisdictions or they are not active Active.';
            dataMessage.noSearchResultsJurisdiction      = 'You did not select a Jurisdiction or no Active Jurisdictions were found.';
            dataMessage.noSearchResultsCustomerPayment   = 'There are no withholdings for the selected criteria.';
            dataMessage.noResultsForOriginalReport       = 'there were no results for original report.';
            dataMessage.noResultsForExtraReport          = 'there were no results for extra report.';
            dataMessage.withholdingsWithEmptyFields      = 'some withholdings were not included due to the presentation of empty fields, a TXT file is generated with the information';
        }
    }

    /* Req. 0056 */
    function noResultsInSearchRequired(message){
        throw message;
    }

    /* Req. 0056 */
    function formatIncorrect(message){
        throw message;
    }

    /* Req. 0056 */
    function validateEmptyFields(object){
        //se verifican todos los tipos de valores vacios
        //que puede devolver Netsuite
        var result = false;
        loop: for(i in object){
            //solo este campo puede ser vacio por lo tanto se
            //salta la verificacion
            if(i==='numWithholding'){
                continue;
            }
            switch (object[i]){
                case undefined:
                case null:
                case ''://strict comparison, this is not confused with Number 0
                    result = true;
                    break loop;//redirect the Break to the For and terminate the loop
                default:
                    if(Number.isNaN(object[i])){//the NaN value is also verified
                        result = true;
                        break loop;//redirect the Break to the For and terminate the loop
                    }
            }
        }
        return result;
    }

    /* Req. 0056 */
    function validateJurisdiction(value){
        //solo es valido string vacio y valores numericos
        switch (value){
            case ''://cuando es vacio significa que se requieren todas las jurisdicciones
                return true;
                break;
            default:
                if(!parseInt(value)){
                    formatIncorrect(dataMessage.wrongJurisdictionParameterFormat)
                }
                return true;
        }
    }

    /* Req. 0056 */
    function validatePeriod(value){
        switch (value){
            case undefined:
            case null:
            case '':
                formatIncorrect(dataMessage.wrongPeriodParameterFormat);
                break;
            default:
                return true;
        }
    }

    /* Req. 0056 */
    function validateSubsidiary(value){
        //solo es valido null y valores numericos
        switch (value){
            case null://cuando es noOneWolrd este es el valor en la request
                return true;
                break;
            default:
                if(!parseInt(value)){
                    formatIncorrect(dataMessage.wrongSubsidiaryParameterFormat);
                }
                return true;
        }
    }

    /* Req. 0056 */
    function getPaymentMethodsWithQbtJurisdictions(idJurisdictions){
        /* run Search */
        var results = search.create({
            type: 'customrecord_qbt_payment_method_jurisdic',
            columns: [
                'custrecord_qbt_payment_method_parent'
                ,'custrecord_qbt_jurisdictions'
                ,'custrecord_qbt_numbers_periods'
            ],
            filters: globalPaymentMethodsWithQbtJurisdiction.filtersSearch
        })
        var pagedData = results.runPaged({pageSize: 1000});
        /* end run Search */

        /* iterating results */
        if(pagedData.pageRanges.length<=0){
            noResultsInSearchRequired(dataMessage.noSearchResultsMethPayWithJuris);
        } else {
            for( var i=0; i < pagedData.pageRanges.length; i++ ) {
                var currentPage = pagedData.fetch(i);
                currentPage.data.forEach(function(result) {

                    var paymentMethodId = parseInt(result.getValue('custrecord_qbt_payment_method_parent'));
                    var jurisdictionId  = parseInt(result.getValue('custrecord_qbt_jurisdictions'));
                    var codJurisdiction = globalQbtJurisdictions.resultSearch[jurisdictionId].codJurisdiction;
                    var numPeriodValid  = parseInt(result.getValue('custrecord_qbt_numbers_periods'));
                    
                    globalPaymentMethodsWithQbtJurisdiction.resultSearch[paymentMethodId] = { 
                        codJurisdiction: codJurisdiction
                        ,numPeriodValid: numPeriodValid }
                    globalPaymentMethodsWithQbtJurisdiction.resultSearch.listOnlyIds.push(paymentMethodId);
                })
            }
            /*
                e.g. of Structure stored 
                {
                    "listOnlyIds":[47,15,16],
                    "47"    :{"codJurisdiction":901,"numPeriodValid":2},
                    "15"    :{"codJurisdiction":907,"numPeriodValid":2},
                    "16"    :{"codJurisdiction":901,"numPeriodValid":1}
                }
            */
        }
        /* end iterating results */
    }

    /* Req. 0056 */
    function getQbtJurisdictions(){
        /* run Search */
        var results = search.create({
            type: 'customrecord_qbt_jurisdictions',
            columns: ['internalid','custrecord_qbt_juris_code'],
            filters: globalQbtJurisdictions.filtersSearch
        })
        var pagedData = results.runPaged({pageSize: 1000});
        /* end run Search */

        /* iterating results */
        if(pagedData.pageRanges.length<=0){
            noResultsInSearchRequired(dataMessage.noSearchResultsJurisdiction);
        } else {
            for( var i=0; i < pagedData.pageRanges.length; i++ ) {
                var currentPage = pagedData.fetch(i);
                currentPage.data.forEach(function(result) {
                    var jurisdictionId  = parseInt(result.getValue('internalid'));
                    var codJurisdiction = parseInt(result.getValue('custrecord_qbt_juris_code'));

                    globalQbtJurisdictions.resultSearch[jurisdictionId] = {
                        codJurisdiction: codJurisdiction };
                    globalQbtJurisdictions.resultSearch.listOnlyIds.push(jurisdictionId);
                })
            }
            /*
                e.g. of Structure stored
                {
                    "listOnlyIds":[3,1,6],
                    "3"     :{"codJurisdiction":903},
                    "1"     :{"codJurisdiction":901},
                    "6"     :{"codJurisdiction":906}
                }
            */
        }
        /* end iterating results */
    }  

    /* Req. 0056 */
    function generateText(){
        //segun requerimiento son valores constantes
        const typeVoucher = 'R';
        const letter      = 'E';

        for (var i in globalCustomerPayments.resultSearch){
            //esto no deberia suceder, pero igual se valida que no hayan campos
            //vacios, de haber, se almacenan en el reporte de campos vacios
            if(validateEmptyFields(globalCustomerPayments.resultSearch[i])){
                outputResponse.sectionEmptyField += JSON.stringify(globalCustomerPayments.resultSearch[i])+'\r\n';
                continue;
            }

            var codJurisdiction = globalCustomerPayments.resultSearch[i].codJurisdiction;
            var numPeriodValid  = parseInt(globalCustomerPayments.resultSearch[i].numPeriodValid);
            var cuitCustomer    = qbt_lib_common.qbt_lib_setTaxId(globalCustomerPayments.resultSearch[i].cuitCustomer);
            var dateWithholding = globalCustomerPayments.resultSearch[i].dateWithholding;
            var numWithholding  = qbt_lib_common.qbt_lib_padES5(globalCustomerPayments.resultSearch[i].numWithholding,20,true,0);
            var numLegalVoucher = qbt_lib_common.qbt_lib_padES5(globalCustomerPayments.resultSearch[i].numLegalVoucher,20,true,0);
            var exchangerate    = globalCustomerPayments.resultSearch[i].exchangerate;
            var trandate        = globalCustomerPayments.resultSearch[i].trandate;
            var total           = globalCustomerPayments.resultSearch[i].total*exchangerate;
            
            //a veces el monto es exacto y javascript elimina los decimales.
            //con toFixed se agregan 2 decimales en caso de no tenerlos, porque el reporte exige 2 decimales
            total = total.toFixed(2);
            total = qbt_lib_common.qbt_lib_numberWithCommas(total);
            total = qbt_lib_common.qbt_lib_padES5(total,11,true,0)

            //se formatea la fecha al estandar de argentina. en el switch case puede ser necesaria
            //dateWithholding en su forma original, por eso el cambio se almacena en una nueva variable
            var es_ARDateWithholding = qbt_lib_common.qbt_lib_getLocaleShortDateString("es_AR",dateWithholding);

            switch (numPeriodValid){
                case 0:
                    //el requerimiento indica que si la jurisdiccion tiene configurado este parametro
                    //como 0 entonces no es necesario evaluar el numero de periodos que hay entre la
                    //fecha de la retencion y la fecha del pago, y por lo tanto se agrega al reporte original
                    outputResponse.sectionOriginal += codJurisdiction+cuitCustomer+es_ARDateWithholding+numWithholding+typeVoucher+letter+numLegalVoucher+total+'\r\n';
                    break;
                default:
                    //si el numero de periodo es diferente de 0 hay que hacer un calculo para comprobar
                    //el numero de periodos que hay entre la fecha de la retencion y la fecha del pago
                    //y asi comprobar si debe ir en el reporte original o en el reporte extra
                    
                    //se calcula la diferencia de periodos que hay entre la fecha de la retencion y la fecha de pago
                    var cantPeriod = qbt_lib_common.qbt_lib_calculateMonths(dateWithholding,trandate);
                    
                    if(cantPeriod<=numPeriodValid){
                        outputResponse.sectionOriginal += codJurisdiction+cuitCustomer+es_ARDateWithholding+numWithholding+typeVoucher+letter+numLegalVoucher+total+'\r\n';
                    }else{
                        outputResponse.sectionExtra += codJurisdiction+cuitCustomer+es_ARDateWithholding+numWithholding+typeVoucher+letter+numLegalVoucher+total+'\r\n';
                    }
            }
        }
    }

    /* Req. 0056 */
    function getCustomerPayments() {
        /* run Search */
        var results = search.create({
            type: search.Type.CUSTOMER_PAYMENT,
            columns: [
                 { name: 'internalid' }
                ,{ name: 'paymentmethod' }
                ,{ name: 'custentity_qbt_taxid', join: 'customer' }
                ,{ name: 'custbody_qbt_withholding_certific_date' }
                ,{ name: 'custbody_qbt_withholding_certific_num' }
                ,{ name: 'custbody_qbt_num_legal_voucher' }
                ,{ name: 'exchangerate'}
                ,{ name: 'trandate' }
                ,{ name: 'total' }
            ],
            filters: globalCustomerPayments.filtersSearch
        })
        var pagedData = results.runPaged({pageSize: 1000});
        /* end run Search */

        /* iterating results */
        if(pagedData.pageRanges.length<=0){
            noResultsInSearchRequired(dataMessage.noSearchResultsCustomerPayment);
        } else {
            for( var i=0; i < pagedData.pageRanges.length; i++ ) {
                var currentPage = pagedData.fetch(i);
                currentPage.data.forEach(function(result) {
                    var paymentMethodId = result.getValue({ name: 'paymentmethod' });
                    
                    globalCustomerPayments.resultSearch.push({
                         idRecord : result.getValue({ name: 'internalid' })
                        ,codJurisdiction : globalPaymentMethodsWithQbtJurisdiction.resultSearch[paymentMethodId].codJurisdiction
                        ,numPeriodValid  : globalPaymentMethodsWithQbtJurisdiction.resultSearch[paymentMethodId].numPeriodValid
                        ,cuitCustomer    : result.getValue({ name: 'custentity_qbt_taxid', join: 'customer' })
                        ,dateWithholding : result.getValue({ name: 'custbody_qbt_withholding_certific_date' })
                        ,numWithholding  : result.getValue({ name: 'custbody_qbt_withholding_certific_num' })
                        ,numLegalVoucher : result.getValue({ name: 'custbody_qbt_num_legal_voucher' })
                        ,exchangerate    : result.getValue({ name: 'exchangerate' })
                        ,trandate : result.getValue({ name: 'trandate' })
                        ,total    : result.getValue({ name: 'total' })

                    });
                })
            }
        }
        /* end iterating results */ 
    }

    /* Req. 0056 */
    function setFiltersForSearchPaymentMethodsWithQbtJurisdictions(){
        
        //no es necesario validar si la lista de IDs:
        //globalQbtJurisdictions.resultSearch.listOnlyIds esta vacia
        //porque esa validacion se efectua en los resultados
        //de la busqueda que se realiza en la funcion getQbtJurisdictions()

        //este filtro es para buscar solo las formas de pago que esten relacionadas
        //a la jurisdiccion que se eligio en los criterios de busqueda, obvio que si
        //el usuario selecciono todas las jurisdicciones, el valor de este filtro seran
        //todas las jurisdicciones, y si el usuario solo selecciono una jurisdiccion el
        //valor de este filtro sera una unica jurisdiccion

        //si se pregunta ¿por que necesitamos basar este filtro en los resultados de la busqueda
        //de QbtJurisdicciones?, cuando podemos simplemente utilizar el parametro
        //request.jurisdiction.
        //es porque se necesita el valor del Codigo de jurisdiccion, y ese
        //solo se obtiene con la busqueda de jurisdicciones.
        globalPaymentMethodsWithQbtJurisdiction.filtersSearch.push({
            name: 'custrecord_qbt_jurisdictions', 
            operator: search.Operator.IS,
            values: globalQbtJurisdictions.resultSearch.listOnlyIds
        });

        //filtro obligatorio para no incluir registros inactivos
        globalPaymentMethodsWithQbtJurisdiction.filtersSearch.push({
            name: 'isinactive',
            operator: search.Operator.IS,
            values: false
        });
    }

    /* Req. 0056 */
    function setFiltersForSearchQbtJurisdictions(idQbtJurisdiction){
        //si el string tiene algun valor es true, lo que significa
        //que se quiere buscar sobre una jurisdiccion en especifico,
        //de lo contrario, se omite el filtro y, al omitir el filtro
        //la busqueda tomaria en cuenta todas las jurisdicciones
        if(idQbtJurisdiction){
            globalQbtJurisdictions.filtersSearch.push({
                name: 'internalid', 
                operator: search.Operator.IS,
                values: idQbtJurisdiction });
        }
        
        //filtro obligatorio para no incluir registros inactivos
        globalQbtJurisdictions.filtersSearch.push({
            name: 'isinactive',
            operator: search.Operator.IS,
            values: false });
    }

    /* Req. 0056 */
    function setFiltersForSearchCustomerPayment(request){  
        
        //no es necesario validar si la lista de IDs:
        //globalPaymentMethodsWithQbtJurisdiction.resultSearch.listOnlyIds
        //esta vacia porque esa validacion se efectua en los resultados
        //de la busqueda que se realiza en la funcion getPaymentMethodsWithQbtJurisdictions()
        globalCustomerPayments.filtersSearch.push({
            name: 'paymentmethod',
            operator: search.Operator.IS,
            values: globalPaymentMethodsWithQbtJurisdiction.resultSearch.listOnlyIds
        });
        
        //si esta validacion es False significa que es notOneWorld
        //y no necesita este filtro, de lo contrario se incluye subsidiary
        if(request.company) {
            globalCustomerPayments.filtersSearch.push({
                name: 'subsidiary',
                operator: search.Operator.IS,
                values: request.company
            });
        }

        if(request.department) {
            globalCustomerPayments.filtersSearch.push({
                name: 'department',
                operator: search.Operator.IS,
                values: request.department
            });
        }

        if(request.class) {
            globalCustomerPayments.filtersSearch.push({
                name: 'class',
                operator: search.Operator.IS,
                values: request.class
            });
        }

        if(request.location) {
            globalCustomerPayments.filtersSearch.push({
                name: 'location',
                operator: search.Operator.IS,
                values: request.location
            });
        }
        
        var period = request.period.split('_');

        //se crea el Objeto Date a partir de los valores en el array period pero,
        //los filtros de busqueda necesitan estos valores en formato String, entonces
        //se crea el Objeto Date y luego se retorna como String Date
        var fromDate = qbt_lib_common.qbt_lib_firstDayOfTheMonth(period,"returnLikeString");
        var toDate   = qbt_lib_common.qbt_lib_lasDayOfTheMonth(period,"returnLikeString");

        globalCustomerPayments.filtersSearch.push({
            name: 'trandate',
            operator: search.Operator.ONORAFTER,
            values: fromDate
        });

        globalCustomerPayments.filtersSearch.push({
            name: 'trandate',
            operator: search.Operator.ONORBEFORE,
            values: toDate
        });
    }

    /* Req. 0056 */
    function validateInput(request){
        validateJurisdiction(request.jurisdiction);
        validatePeriod(request.period);
        validateSubsidiary(request.company);
    }

    /*
         class     
        ,period    
        ,toDate    
        ,company   
        ,location  
        ,fromDate  
        ,department
    */

    /* Main Function */
    function _get(request){
        /* Req. 0056 */
        setConfigLang();
        validateInput(request);

        setFiltersForSearchQbtJurisdictions(request.jurisdiction);
        getQbtJurisdictions();

        setFiltersForSearchPaymentMethodsWithQbtJurisdictions();
        getPaymentMethodsWithQbtJurisdictions();

        setFiltersForSearchCustomerPayment(request);
        getCustomerPayments();
        
        generateText();
        
        return outputResponse.returnResultsInJSONStringify();
        /* End Req. 0056 */
    }

    return {
        get: _get
    }
});
