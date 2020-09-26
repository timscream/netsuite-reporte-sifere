/**
* @NApiVersion 2.0
* @NScriptType MapReduceScript
*/
define(['N/record', 'N/search', 'N/runtime', 'N/email', 'N/format','N/config'],
    function(record, search, runtime, email, format,config){
        function getInputData(context){
            var myObj = runtime.getCurrentScript();
            var met = myObj.getParameter({name:'custscript_params_methods'});
            var ctx = JSON.parse(met);
            log.error(ctx);
            // var comp = myObj.getParameter({name:'custscript_params_components'});
            // var params = myObj.getParameter({name:'custscript_params_form'});
            // parameters = JSON.parse(params);
            // components = JSON.parse(comp);
            return ctx;
        }
        function map(context){
            /*
            methods.reference = 000tim001 numero de referencia
            methods.emisor = 111tim110 Número de documento del emisor
            methods.amount = 981.00
            parameters.custpage_number = number 45
            */
            log.error('map');
            var methods = JSON.parse(context.value);
            var myObj = runtime.getCurrentScript();
            // var comp = myObj.getParameter({name:'custscript_params_components'});
            var params = myObj.getParameter({name:'custscript_params_form'});
            var paymentDetailsId = myObj.getParameter({name:'custscript_params_paydet'});
            var qbt_number = myObj.getParameter({name:'custscript_params_nextnumber'});
            log.error('qbt_number',qbt_number)
            var parameters = JSON.parse(params);
            var comp = search.lookupFields({
                type: 'customrecord_qbt_payment_details',
                id: paymentDetailsId,
                columns:[
                    'custrecord_qbt_paydet_components'
                ]
            }).custrecord_qbt_paydet_components
            var components = JSON.parse(comp);
            log.error('metods',methods);
            log.error('comp',components);
            log.error('params',parameters);
            var checksid = parameters.custpage_checkid ? JSON.parse(parameters.custpage_checkid):[]
            try{
                if(checksid){
                    for(var c=0; c<checksid.length; c++){
                        log.error('Check id',checksid[c]);
                        record.delete({
                            type: 'customrecord_qbt_check_reader',
                            id: checksid[c]
                        });
                    }
                }
            }catch(e){
                log.error('Cheques',e);
            }
            
            if(methods.amount>0){          
                var typepm=0;
                var cuentaDebito;
                var cuentaCredito = search.lookupFields({
                    type:'paymentmethod',
                    id:methods.idPayment,
                    columns:[
                        'account'
                    ]
                });
                log.error('step 1');
                search.create({
                    type: 'customrecord_qbt_payment_method',
                    filters: ['custrecord_qbt_pay_method_parent', 'is', [methods.idPayment]],//context.request.parameters.paymentgroup
                    columns: [
                        'custrecord_qbt_pay_method_parent',
                        'custrecord_qbt_account',
                        'custrecord_qbt_type_of_method']
                }).run().each(function (result) {
                    cuentaDebito = result.getValue({ name: 'custrecord_qbt_account' });
                    typepm = result.getValue({name: 'custrecord_qbt_type_of_method'})
                    return false;
                });
                var obj = record.create({
                    type: 'customerpayment',
                    isDynamic: true
                });
                obj.setValue({
                    fieldId: 'paymentmethod',
                    value: methods.idPayment
                });
                log.error('Payment Method',methods.idPayment)
                obj.setValue({
                    fieldId: 'customer',
                    value: parameters.custpage_entity
                });
                obj.setValue({
                    fieldId: 'currency',
                    value: parameters.custpage_currency
                });
                try{
                    obj.setValue({
                        fieldId: 'subsidiary',
                        value: parameters.custpage_subsidiary
                    });
                }catch(e){

                }
                log.error('typepm value', typepm)           
                log.error('step 2');
                if(typepm == 1){
                    try{
                        obj.setValue({
                            fieldId: 'undepfunds',
                            value: 'F'
                        });
                        obj.setValue({
                            fieldId: 'account',
                            value: cuentaCredito.account[0].value
                        });
                    }catch(e){
                        log.error('Account',cuentaCredito.account[0].value);
                        log.error('Account',cuentaCredito);
                        obj.setValue({
                            fieldId: 'undepfunds',
                            value: 'T'
                        });
                    }
                }
                if(typepm == 3){
                    obj.setValue({
                        fieldId: 'undepfunds',
                        value: 'T'
                    });
                    obj.setValue({
                        fieldId: 'custbody_qbt_check_status',
                        value: 3
                    });
                    var duedate = format.format({
                        value: methods.dueDate,
                        type: format.Type.DATE
                    });
                    duedate = format.parse({
                        value: duedate,
                        type: format.Type.DATE
                    });
                    obj.setValue({
                        fieldId: 'custbody_qbt_payment_duedate',
                        value: duedate
                    });
                    obj.setValue({
                        fieldId: 'checknum',
                        value: methods.reference
                    });
                }else if(typepm == 4){
                    try{
                        var account = search.lookupFields({
                            type: 'paymentmethod',
                            id: methods.idPayment,
                            columns:[
                                'account'
                            ]
                        }).account[0].value
                        
                        obj.setValue({
                            fieldId: 'undepfunds',
                            value: 'F'
                        });
                        obj.setValue({
                            fieldId: 'account',
                            value: account
                        });
                    }catch(e){
                        obj.setValue({
                            fieldId: 'undepfunds',
                            value: 'T'
                        });
                    }
                }
                log.error('step 3');
                obj.setValue({
                    fieldId: 'custbody_qbt_group',
                    value: paymentDetailsId
                });
                /* el antiguo programador coloco este setValue
                pero la realidad es que custbody_qbt_number no
                existe, ya hice pruebas y no existe, o por lo menos
                no para el record customer payment, dejo esto
                aqui para que lo sepan y averiguen que paso
                con el req 0025, porque este campo es de ese req*/
                obj.setValue({
                    fieldId: 'custbody_qbt_number',
                    value: qbt_number
                });
                obj.setValue({
                    fieldId: 'custbody_qbt_payment_endorsement',
                    value: methods.endorsement
                });
                obj.setValue({
                    fieldId: 'custbody_qbt_payment_endorsement_qty',
                    value: methods.endorsementQty
                });
                log.error('emisor',methods.emisor);
                obj.setValue({
                    fieldId: 'custbody_qbt_doc_number_emisor',
                    value: methods.emisor
                });
                /* begin req. 0056 SIFERE */
                obj.setValue({
                    fieldId: 'custbody_qbt_num_legal_voucher',
                    value: parameters.custpage_number
                });
                obj.setValue({
                    fieldId: 'custbody_qbt_withholding_certific_date',
                    value: methods.dueDate
                });
                obj.setValue({
                    fieldId: 'custbody_qbt_withholding_certific_num',
                    value: methods.reference
                });
                /* end req. 0056 SIFERE */
                var date = format.parse({
                    value: parameters.custpage_date,
                    type: format.Type.DATE
                })
                obj.setValue({
                    fieldId: 'trandate',
                    value: date
                });
                obj.setValue({
                    fieldId: 'autoapply',
                    value: false
                });
                log.error('credits');
                try{
                    obj.setValue({
                        fieldId: 'payment',
                        value: methods.amount
                    });
                    var idCP = obj.save({
                        ignoreMandatoryFields: true
                    });
                    log.error('idcp' + idCP);
                    obj = record.load({
                        type: 'customerpayment',
                        id: idCP,
                        isDynamic: true
                    });
                    // obj.setValue({
                    //     fieldId: 'payment',
                    //     value: ' '
                    // });
                    // probar
                    try{
                        obj.setValue({
                            fieldId: 'class',
                            value: parameters.classfield
                       
                        });                    
                    }catch(e){
    
                    }
                    try{
                        obj.setValue({
                            fieldId: 'location',
                            value: parameters.locfield
                        });                   
                    }catch(e){
                        log.error('localization error', e.message)
                    }
                    try{
                        obj.setValue({
                            fieldId: 'department',
                            value: parameters.depfield
                        });                      
                    }catch(e){
    
                    }
                }catch(e){
                    log.error('Save/Edit',e.message);
                }
                if(parameters.custpage_amtapplied>0){
                    for(var i = 0; i < components.credits.length; i++){
                        if(components.credits[i].paymentapp>0){
                            var lineNumber = obj.findSublistLineWithValue({
                                sublistId: 'credit',
                                fieldId: 'internalid',
                                value: components.credits[i].internalId
                            });
                            obj.selectLine({
                                sublistId: 'credit',
                                line: lineNumber
                            });
                            obj.setCurrentSublistValue({
                                sublistId: 'credit',
                                fieldId: 'apply',
                                value: true
                            });
                            obj.setCurrentSublistValue({
                                sublistId: 'credit',
                                fieldId: 'amount',
                                value: components.credits[i].paymentapp
                            });
                            methods.amountapp = parseInt(methods.amountapp);
                            components.credits[i].paymentapp=parseInt(components.credits[i].paymentapp)
                            methods.amountapp = methods.amountapp + components.credits[i].paymentapp;
                            components.credits[i].paymentapp=0;
                        }           
                    }
                    log.error('methods',components.methods)
                    log.error('invoices',components.invoices)
                    try{
                        for(var j = 0; j < components.invoices.length; j++){
                            if(components.invoices[j].paymentapp>0 && methods.amountapp>0){
                                var lineNumber = obj.findSublistLineWithValue({
                                    sublistId: 'apply',
                                    fieldId: 'internalid',
                                    value: components.invoices[j].internalId
                                    });
                                obj.selectLine({
                                    sublistId: 'apply',
                                    line: lineNumber
                                });
                                log.error('invoices 1.2',lineNumber);
                                if(methods.amountapp>0 && methods.amountapp){
                                    log.error('invoices 2');
                                    obj.setCurrentSublistValue({
                                        sublistId: 'apply',
                                        fieldId: 'apply',
                                        value: true
                                    });
                                    if(parseInt(methods.amountapp) >= parseInt(components.invoices[j].paymentapp)){
                                        obj.setCurrentSublistValue({
                                            sublistId: 'apply',
                                            fieldId: 'amount',
                                            value: components.invoices[j].paymentapp
                                        });
                                        methods.amountapp = methods.amountapp - components.invoices[j].paymentapp
                                        components.invoices[j].paymentapp = 0;
                                    }else{
                                        obj.setCurrentSublistValue({
                                            sublistId: 'apply',
                                            fieldId: 'amount',
                                            value: methods.amountapp
                                        });
                                        components.invoices[j].paymentapp = components.invoices[j].paymentapp-methods.amountapp
                                        methods.amountapp = 0;
                                    }
                                }
                            }
                        }
                    }catch(e){log.error('Invoice Error',e.message)}
                    log.error('deposits');
                    //deposits
                    for(var j = 0; j < components.deposits.length; j++){
                        if(components.deposits[j].paymentapp>0){
                            var lineNumber = obj.findSublistLineWithValue({
                                sublistId: 'deposit',
                                fieldId: 'internalid',
                                value: components.deposits[j].internalId
                            });
                            obj.selectLine({
                                sublistId: 'deposit',
                                line: lineNumber
                            });
                            if(methods.amountapp>0 && methods.amountapp){
                                obj.setCurrentSublistValue({
                                    sublistId: 'deposit',
                                    fieldId: 'apply',
                                    value: true
                                });
                                if(parseInt(methods.amountapp) >= parseInt(components.deposits[j].paymentapp)){
                                    obj.setCurrentSublistValue({
                                        sublistId: 'deposit',
                                        fieldId: 'amount',
                                        value: components.deposits[j].paymentapp
                                    });
                                    methods.amountapp = methods.amountapp - components.deposits[j].paymentapp
                                    components.deposits[j].paymentapp = 0;
                                }else{
                                    obj.setCurrentSublistValue({
                                        sublistId: 'deposit',
                                        fieldId: 'amount',
                                        value: methods.amountapp
                                    });
                                    components.deposits[j].paymentapp = components.deposits[j].paymentapp-methods.amountapp
                                    methods.amountapp = 0;
                                }
                            }
                        }
                    }
                }else{
                    obj.setValue({
                        fieldId: 'payment',
                        value: methods.amount
                    });
                }
                try{
                    var period = parameters.custpage_postingperiod;
                    log.error('period',period);
                    obj.setValue({
                        fieldId: 'postingperiod',
                        value: period
                    });
                }catch(e){
                    
                }
                obj.setValue({
                    fieldId: 'exchangerate',
                    value: parameters.custpage_exchangerate
                });   
                try{
                    var id = obj.save({
                        ignoreMandatoryFields: true
                    });
                    components.payId.push(id);
                }catch(e){
                    log.error('Save',e.message)
                }
                
                log.error('tipo de entrada',typepm)
                if(typepm == 1){
                    try{
                    if (!cuentaDebito) {
                    
                        var configRecObj = config.load({
                            type: config.Type.ACCOUNTING_PREFERENCES
                        });
                        cuentaDebito = configRecObj.getValue({
                            fieldId: 'DROPSHIPEXPENSEACCOUNT'
                        });
                    }
                    journal = record.create({
                        type: 'journalentry',
                        isDynamic: true
                    });
                    try{
                        journal.setValue({
                            fieldId: 'subsidiary',
                            value: parameters.custpage_subsidiary
                        });
                    }catch(e){

                    }
                    
                    journal.setValue({
                        fieldId: 'currency',
                        value: parameters.custpage_currency
                    });
                    try{
                        journal.setValue({
                            fieldId: 'exchangerate',
                            value: parameters.custpage_exchangerate
                        });
                    }catch(e){
                        journal.setValue({
                            fieldId: 'exchangerate',
                            value: 1
                        });
                    }

                    var formatDate = format.parse({
                        value: parameters.custpage_date,
                        type: format.Type.DATE
                    })
                    journal.setValue({
                        fieldId: 'trandate',
                        value: formatDate
                    });
                    journal.setValue({
                        fieldId: 'createdfrom',
                        value: id
                    });
                    journal.setValue({
                        fieldId: 'approved',
                        value: true
                    });

                    try{
                        journal.setValue({
                            fieldId: 'class',
                            value: parameters.classfield
                       
                        });                    
                    }catch(e){
    
                    }
                    try{
                        journal.setValue({
                            fieldId: 'location',
                            value: parameters.locfield
                        });                   
                    }catch(e){
                        
                    }
                    try{
                        journal.setValue({
                            fieldId: 'department',
                            value: parameters.depfield
                        });                      
                    }catch(e){
    
                    }

                    // LINEA DEBITO
                    journal.selectNewLine({
                        sublistId: 'line'
                    });
                    /*
                        Debit -> Custom
                        Credit -> Std
                    */
                    journal.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'account',
                        value: cuentaDebito,//DEBITO
                        ignoreFieldChange: true
                    });

                    try{
                        journal.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'subsidiary',
                            value: parameters.custpage_subsidiary,
                            ignoreFieldChange: true
                        });
                    }catch(e){

                    }

                    journal.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'debit',
                        value: methods.amount,//monto de customer payment
                        ignoreFieldChange: true
                    });

                    journal.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'entity',
                        value: parameters.custpage_entity,//cliente
                        ignoreFieldChange: true
                    })
                    journal.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'memo',
                        value: 'Customer Payment #'+id,//Withholding ARG
                        ignoreFieldChange: true
                    })                                

                    try{
                        journal.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'department',
                            value: parameters.depfield,
                            ignoreFieldChange: true
                        });
                    }catch(e){

                    }                 
                    try{
                        journal.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'location',
                            value: parameters.locfield,
                            ignoreFieldChange: true
                        });
                    }catch(e){

                    }
                     try{
                        journal.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'class',
                            value: parameters.classfield,
                            ignoreFieldChange: true
                        });
                    }catch(e){

                    }
                    
                    journal.commitLine({
                        sublistId: 'line'
                    })

                    //Linea Credito


                    journal.selectNewLine({
                        sublistId: 'line'
                    });
            

                    journal.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'account',
                            value: cuentaCredito.account[0].value//CREDITO
                    });
            
                    journal.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'credit',
                        value: methods.amount,//MONTO
                    });
                    try{
                        journal.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'subsidiary',
                            value: parameters.custpage_subsidiary,//SUBSIDIARIA
                        });
                    }catch(e){

                    }
            
                    journal.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'entity',
                        value: parameters.custpage_entity,// CLIENTE
                        ignoreFieldChange: true
                    });
                    journal.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'memo',
                        value: 'Customer Payment #'+id,// WITHHOLDING ARG
                        ignoreFieldChange: true
                    })
                 
                    try{
                        journal.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'department',
                            value: parameters.depfield,
                            ignoreFieldChange: true
                        });
                    }catch(e){

                    }                 
                    try{
                        journal.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'location',
                            value: parameters.locfield,
                            ignoreFieldChange: true
                        });
                    }catch(e){

                    }
                     try{
                        journal.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'class',
                            value: parameters.classfield,
                            ignoreFieldChange: true
                        });
                    }catch(e){

                    }
                    journal.commitLine({
                        sublistId: 'line'
                    });
                    var idJ = journal.save();
                    try{
                        record.submitFields({
                            type: 'journalentry',
                            id: idJ,
                            values: {
                                'exchangerate': parameters.custpage_exchangerate
                            },
                            options:{
                             ignoreMandatoryFields : true
                             
                            }
                        });
                    }catch(e){
                        record.submitFields({
                            type: 'journalentry',
                            id: idJ,
                            values: {
                                'exchangerate': 1
                            },
                            options:{
                             ignoreMandatoryFields : true
                           
                            }
                        });
                    }
                    var o = false;
                    record.submitFields({
                        type: 'customerpayment',
                        id: id,
                        values: {
                            'custbody_qbt_journalentry' : idJ
                        },
                        options:{
                           ignoreMandatoryFields : true
                        
                        }
                    });
                    }catch(e){
                        log.error('Error en Journal',e);
                    }
                }
            }
            
            record.submitFields({
                type: 'customrecord_qbt_payment_details',
                id: paymentDetailsId,
                values: {
                    'custrecord_qbt_paydet_components': JSON.stringify(components)
                },
                options:{
                    ignoreMandatoryFields : true
                }
            });
        }       
    
        function summarize(){
    
        //Add code for summary details
    
        }
    
        return{
            getInputData: getInputData,
            map: map
            // summarize: summarize
        };
});