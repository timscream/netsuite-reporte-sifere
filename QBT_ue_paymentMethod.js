/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/ui/serverWidget','N/search','N/record','N/runtime', 'N/redirect', 'N/error', 'N/util'], function(serverWidget,search,record,runtime,redirect, error, util) {
    var dataMessage = {};

    function beforeLoad(context) {
        setConfigLang();
        render(context);
        
        /* 
        * Beginning Req. 0056
        */ 
        /* siempre se deben crear los campos en los 3 eventos validados a continuacion*/
        if(context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT || context.type === context.UserEventType.VIEW) {
            createFieldsSIFERE(context);
        }

        /* en caso que el tipo de evento sea edicion o vista se busca la informacion relacionada al metodo de pago */
        if(context.type === context.UserEventType.EDIT || context.type === context.UserEventType.VIEW) {
            fillInFieldsSIFERE(context)
        }
        /* 
        * End Req. 0056
        */
    }

    function beforeSubmit(context) {
        if (context.type === context.UserEventType.DELETE){
            var idDataLoc = getLocalizationRecord(context, false);
            if(idDataLoc){
                var locRecordDelete = record.delete({
                    type: 'customrecord_qbt_payment_method',
                    id: idDataLoc.locId
                });   
            }
        }
    }

    function afterSubmit(context) {
        /* 
        * Beginning Req 0056
        * después que la edición del metodo de pago concluya, se capturan los valores necesarios
        * para actualizar la informacion relacionada a la jurisdiccion y el numero de periodos validos
        */
        var paymentMethodId    = context.newRecord.getValue({fieldId: 'id'});
        var jurisdiction       = String(context.newRecord.getValue({fieldId: 'custpage_qbt_jurisdiction'}));
        var numberValidPeriods = Number(context.newRecord.getValue({fieldId: 'custpage_qbt_number_valid_periods'}));
        var internalIdCustomRecordPaymentMethodWithJurisdiction = String(context.newRecord.getValue({fieldId: 'custpage_qbt_internalid_customrecord_paymentmethodwithjurisdiction'}));

        if (context.type === context.UserEventType.CREATE) {
            /* en caso que el contexto sea crear se insertan los valores en el custom record */
            insertQbtPaymentMethodWithJurisdiction(paymentMethodId, jurisdiction, numberValidPeriods);
        }

        if (context.type === context.UserEventType.EDIT) {
            /* en caso que el contexto sea editar se valida que no exista el internalid del custom record */
            if(internalIdCustomRecordPaymentMethodWithJurisdiction === '') {
                /*
                * esta validación es para las formas de pago que fueron creadas antes del
                * nuevo requerimiento, y que aun cuando esten en modo editar, no cuentan
                * con un internalid en el custom record porque aun no han sido registradas,
                * entonces se procede a registrar
                */
                insertQbtPaymentMethodWithJurisdiction(paymentMethodId, jurisdiction, numberValidPeriods);
            } else {
                /*
                * esta validación es para las formas de pago que fueron creadas antes del
                * nuevo requerimiento o después, pero que ya cuentan con un internalid en el
                * nuevo custom record, entonces se procede solo a actualizar sus valores
                */
                updateQbtPaymentMethodWithJurisdiction(internalIdCustomRecordPaymentMethodWithJurisdiction, jurisdiction, numberValidPeriods);
            }
        }

        if (context.type === context.UserEventType.DELETE) {
            /* en caso que el contexto sea eliminar se elimina la dependencia en el custom record */
            if(internalIdCustomRecordPaymentMethodWithJurisdiction !== ''){
            	deleteQbtPaymentMethodWithJurisdiction(internalIdCustomRecordPaymentMethodWithJurisdiction);
            }
        }
        /* end Req 0056 */

        if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT){
            var offline = context.newRecord.getValue({fieldId: 'methodtype'});
            offline = util.isArray(offline) && offline.length > 0 ? offline[0].value : offline;
            if(offline && parseInt(offline) == 9){
                var idDataLoc = getLocalizationRecord(context, true);
                if(idDataLoc){
                    redirect.toRecord({
                        type : 'customrecord_qbt_payment_method', 
                        id : idDataLoc.locId,
                        isEditMode: true,
                        parameters: {
                            'flag':1,
                            'parent': idDataLoc.parent
                        }
                    });
                }
            }
        }
    }

    function render(context) {
        if(context.type == 'view'){
            var form = context.form;
            var id = context.newRecord.id;

            var recordLoc = getLocalizationRecord(context, false);
            if(recordLoc && recordLoc.exist){
                var tab = form.addTab({
                    id : 'custpage_qbt_tab_loc',
                    label : 'Localización ARG'
                });
                var isGrp = form.addField({
                    id : 'custpage_qbt_igprs',
                    type : serverWidget.FieldType.CHECKBOX,
                    label : dataMessage.isGroup,
                    container : 'custpage_qbt_tab_loc'
                });
                
                var icode = form.addField({
                    id : 'custpage_qbt_icode',
                    type : serverWidget.FieldType.TEXT,
                    label : dataMessage.interbanking ,
                    container : 'custpage_qbt_tab_loc'
                });

                var template = form.addField({
                    id : 'custpage_qbt_template',
                    type : serverWidget.FieldType.TEXT,
                    label : dataMessage.template ,
                    container : 'custpage_qbt_tab_loc'
                });

                var nn = form.addField({
                    id : 'custpage_qbt_nn',
                    type : serverWidget.FieldType.TEXT,
                    label : dataMessage.nn,
                    container : 'custpage_qbt_tab_loc'
                });

                var account = form.addField({
                    id : 'custpage_qbt_acc',
                    type : serverWidget.FieldType.TEXT,
                    label : dataMessage.account,
                    container : 'custpage_qbt_tab_loc'
                });

                var type = form.addField({
                    id : 'custpage_qbt_type',
                    type : serverWidget.FieldType.TEXT,
                    label : dataMessage.type,
                    container : 'custpage_qbt_tab_loc'
                });

                var subsidiary = form.addField({
                    id : 'custpage_qbt_sub',
                    type : serverWidget.FieldType.TEXT,
                    label : dataMessage.subsidiary,
                    container : 'custpage_qbt_tab_loc'
                });

                var sublist = form.addSublist({
                    id: 'custpage_details',
                    type: serverWidget.SublistType.INLINEEDITOR,
                    label: dataMessage.details,
                    tab : 'custpage_qbt_tab_loc'

                });
                var paySelect = sublist.addField({
                    id: 'custpage_payselect',
                    type: serverWidget.FieldType.SELECT,
                    label: dataMessage.paymet
                });

                completeMethods(paySelect, id);

                var typeFieldSublist = sublist.addField({
                    id: 'custpage_type',
                    type: serverWidget.FieldType.TEXT,
                    label: dataMessage.type
                });

                typeFieldSublist.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                var interbankFieldSublist = sublist.addField({
                    id: 'custpage_interb',
                    type: serverWidget.FieldType.TEXT,
                    label: dataMessage.interbcode
                });

                interbankFieldSublist.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });
                var sb = ''
                try{
                    sb = search.lookupFields({
                        type: 'subsidiary',
                        id: recordLoc.subsidiary,
                        columns: [
                            'name'
                        ]
                    }).name
                }catch(e){
                    log.error('Subsidiary error')
                }

                isGrp.defaultValue = recordLoc.isGroup == true ? 'T': 'F';
                icode.defaultValue = recordLoc.icode;
                template.defaultValue = recordLoc.template;
                nn.defaultValue = recordLoc.nn;
                account.defaultValue = recordLoc.account;
                type.defaultValue = recordLoc.type;
                subsidiary.defaultValue = sb
                var sub = recordLoc.details;
                sub = (!sub || sub === '') ? [] : JSON.parse(sub);
                for (var index = 0; index < sub.length; index++) {
                    var element = sub[index];
                    sublist.setSublistValue({
                        id: 'custpage_payselect',
                        line: index,
                        value: element
                    });
                    var locData = searchLocalizationData(sub[index]);
                    if (locData) {
                        if (locData.type) {
                            sublist.setSublistValue({
                                id: 'custpage_type',
                                line: index,
                                value: locData.type
                            });
                        }
                        if (locData.icode) {
                            sublist.setSublistValue({
                               id: 'custpage_interb',
                                line: index,
                                value: locData.icode
                            });
                        }
                    }
                }
            }  
        }        
    }

    /* Req. 0056 */
    function createFieldsSIFERE(context){
        /* se dibujan los campos necesarios para el requerimiento de Retenciones IIBB SIFERE */
        var form = context.form;

        /* begin set field internalid custom record */
        var fieldInternalId = form.addField({
            id : 'custpage_qbt_internalid_customrecord_paymentmethodwithjurisdiction',
            type : serverWidget.FieldType.INTEGER,
            label: 'hidden'
        });

        fieldInternalId.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });
        /* end set field */

        /* begin set field list jurisdiction */
        var fieldJurisdiction = form.addField({
            id : 'custpage_qbt_jurisdiction',
            type : serverWidget.FieldType.SELECT,
            label : dataMessage.labelFieldJurisdiction,
            source: 'customrecord_qbt_jurisdictions'
        });

        fieldJurisdiction.setHelpText({
            help : dataMessage.helpTextFieldJurisdiction
        });
        /* end set field */
        
        /* begin set field number valid periods */
        var fieldNumberValidPeriods = form.addField({
            id : 'custpage_qbt_number_valid_periods',
            type : serverWidget.FieldType.SELECT,
            label : dataMessage.labelFieldNumberValidPeriods
        });
        fieldNumberValidPeriods.addSelectOption({value : '', text : ''});
        for(var i=0;i<13;i++){
            fieldNumberValidPeriods.addSelectOption({value : i, text : i});
        }

        fieldNumberValidPeriods.setHelpText({
            help : dataMessage.helpTextFieldNumberValidPeriods
        });
        /* end set field */
    }

    /* Req. 0056 */
    function fillInFieldsSIFERE(context) {
        /* declarando variable que almacena el id de metodo de pago*/
        var paymentMethodId = context.newRecord.getValue({fieldId: 'id'});
        
        var fieldInternalId = context.form.getField('custpage_qbt_internalid_customrecord_paymentmethodwithjurisdiction')
        var fieldJurisdiction = context.form.getField('custpage_qbt_jurisdiction')
        var fieldNumberValidPeriods = context.form.getField('custpage_qbt_number_valid_periods')
        
        /* se obtiene la informacion relacionada al metodo de pago */
        var getPaymentMethodWithJurisdiction = getQbtPaymentMethodWithJurisdiction(paymentMethodId);
        
        for (var i = 0; i < getPaymentMethodWithJurisdiction.length; i++) {
            fieldInternalId.defaultValue         = getPaymentMethodWithJurisdiction[i].internalid
            fieldJurisdiction.defaultValue       = getPaymentMethodWithJurisdiction[i].idJurisdiction
            fieldNumberValidPeriods.defaultValue = getPaymentMethodWithJurisdiction[i].numberPeriods
        }
    }

    /* Req. 0056 */
    function getQbtPaymentMethodWithJurisdiction(paymentMethodId){
        /* se buscan solo la informacion perteneciente al metodo de pago */
        var getPaymentMethodWithJurisdiction=[];

        var results = search.create({
            type: 'customrecord_qbt_payment_method_jurisdic',
            columns: ['internalid', 'custrecord_qbt_jurisdictions', 'custrecord_qbt_numbers_periods'],
            filters: [
                'custrecord_qbt_payment_method_parent', 'is', paymentMethodId
                ,'isinactive', 'is', 'F'
            ]
        })
        var pagedData = results.runPaged({pageSize: 1000});
        for( var i=0; i < pagedData.pageRanges.length; i++ ) {
            var currentPage = pagedData.fetch(i);
            currentPage.data.forEach(function(result) {
                getPaymentMethodWithJurisdiction.push({
                    internalid: result.getValue('internalid')
                   ,idJurisdiction: result.getValue('custrecord_qbt_jurisdictions')
                   ,numberPeriods: result.getValue('custrecord_qbt_numbers_periods')
                })
            })
        }
        return getPaymentMethodWithJurisdiction;
    }

    /* Req. 0056 */
    function insertQbtPaymentMethodWithJurisdiction(paymentMethodId, jurisdiction, numberValidPeriods) {
        try{
        	/*
        	*	begin validation of empty field
        	*
        	*	el Custom Record ya valida pero esto se hace para
        	*	evitar el tiempo de procesamiento que se pierde
        	*	al intentar crear un record que no cumple las condiciones
        	*/
        	if (jurisdiction === "" || jurisdiction === "0" ) {
        		return false;
        	}
        	if ( numberValidPeriods <= 0 ) {
        		return false;
        	}
        	/* end validation of empty field */

            var objRecord = record.create({
                type: 'customrecord_qbt_payment_method_jurisdic',
                isDynamic: true,
            });

            objRecord.setValue({
                fieldId: 'custrecord_qbt_payment_method_parent',
                value: paymentMethodId
            });

            objRecord.setValue({
                fieldId: 'custrecord_qbt_jurisdictions',
                value: jurisdiction
            });

            objRecord.setValue({
                fieldId: 'custrecord_qbt_numbers_periods',
                value: numberValidPeriods
            });

            /*
            * los parametros de validacion ya estan configurados
            * en el custom record, por lo tanto no es necesario
            * establecerlos dentro de la funcion save()
            */
            var objRecordId = objRecord.save();
        } catch (e) {
            log.error({title:'error create record', details: e})
        }
    }

    /* Req. 0056 */
    function updateQbtPaymentMethodWithJurisdiction(internalIdRecord, jurisdiction, numberValidPeriods) {
        try {
            var id = record.submitFields({
                type: 'customrecord_qbt_payment_method_jurisdic',
                id: internalIdRecord,
                values: {
                    custrecord_qbt_jurisdictions: jurisdiction,
                    custrecord_qbt_numbers_periods: numberValidPeriods
                },
                options: {
                    enableSourcing: true,
                    ignoreMandatoryFields : false
                }
            });
        } catch (e) {
            log.error({title:'error update record', details: e})
        }
    }

    /* Req. 0056 */
    function deleteQbtPaymentMethodWithJurisdiction(internalIdRecord) {
        try {
            record.delete({
                type: 'customrecord_qbt_payment_method_jurisdic',
                id: internalIdRecord,
            });
        } catch (e) {
            log.error({title:'error delete record', details: e})
        }
    }

    function getLocalizationRecord(context, create){
        
        var methodId = context.newRecord.getValue({fieldId: 'id'});
        var retorno;
        search.create({
                type: 'customrecord_qbt_payment_method',
                columns: [
                    {name: 'custrecord_qbt_payment_interbanking_code'},
                    {name: 'custrecord_qbt_adv_template'},
                    {name: 'custrecord_qbt_pay_method_parent'},
                    {name: 'custrecord_qbt_is_group'},
                    {name: 'internalid'},
                    {name: 'custrecord_qbt_type_of_method'},
                    {name: 'custrecord_qbt_details_group'},
                    {name: 'custrecord_qbt_next_number'},
                    {name: 'custrecord_qbt_account'},
                    {name: 'custrecord_qbt_pay_subsidiary'}
                ],
                filters: [{
                    name: 'custrecord_qbt_pay_method_parent',
                    operator: 'is',
                    values: methodId
                }]
            }).run().each(function(result){
                retorno = {
                    locId: result.getValue({name: 'internalid'}),
                    details: result.getValue({name: 'custrecord_qbt_details_group'}),
                    account: result.getText({name: 'custrecord_qbt_account'}),
                    type: result.getText({name: 'custrecord_qbt_type_of_method'}),
                    isGroup:result.getValue({name: 'custrecord_qbt_is_group'}),
                    icode: result.getText({name: 'custrecord_qbt_payment_interbanking_code'}),
                    nn: result.getValue({name: 'custrecord_qbt_next_number'}),
                    exist: true,
                    parent: result.getValue({name: 'custrecord_qbt_pay_method_parent'}),
                    template: result.getText({name: 'custrecord_qbt_adv_template'}),
                    subsidiary: result.getValue({name: 'custrecord_qbt_pay_subsidiary'})
                }
                
            });
        if(create){
            if(!retorno){
                var newRec = record.create({
                    type: 'customrecord_qbt_payment_method',
                    isDynamic: true
                });
                newRec.setValue({
                    fieldId: 'custrecord_qbt_pay_method_parent',
                    value: methodId
                });
                var locId = newRec.save({
                    ignoreMandatoryFields: true
                });
                retorno = {
                    locId: locId,
                    exist: false,
                    parent: methodId
                }

            }
        }
        return retorno;
    }

    function completeMethods(field, parent) {
        field.addSelectOption({
            value: -1,
            text: ''
        });

        search.create({
            type: 'paymentmethod',
            columns: [
                { name: 'internalid' },
                { name: 'name' },
            ],
            filters: [{
                    name: 'internalid',
                    operator: search.Operator.NONEOF,
                    values: parent
                }
            ]
        }).run().each(function (result) {
            field.addSelectOption({
                value: result.getValue({ name: 'internalid' }),
                text: result.getValue({ name: 'name' })
            });
            return true;
        });
    }

    function searchLocalizationData(paymethod) {
        if (paymethod) {
            var obj;
            search.create({
                type: 'customrecord_qbt_payment_method',
                columns: [
                    { name: 'internalid' },
                    { name: 'custrecord_qbt_pay_method_parent' },
                    { name: 'custrecord_qbt_type_of_method' },
                    { name: 'custrecord_qbt_payment_interbanking_code' },
                    { name: 'custrecord_qbt_next_number' },
                    { name: 'custrecord_qbt_adv_template' },

                ],
                filters: [{
                    name: 'custrecord_qbt_pay_method_parent',
                    operator: 'is',
                    values: paymethod
                }]
            }).run().each(function (result) {
                obj = {
                    id: result.getValue({ name: 'internalid' }),
                    parent: result.getValue({ name: 'custrecord_qbt_pay_method_parent' }),
                    type: result.getValue({ name: 'custrecord_qbt_type_of_method' }),
                    icode: result.getValue({ name: 'custrecord_qbt_payment_interbanking_code' }),
                    nn: result.getValue({ name: 'custrecord_qbt_next_number' }),
                    template: result.getValue({ name: 'custrecord_qbt_adv_template' })
                }
            });
            if (obj) {
                if (obj.type) {
                    obj.type = search.lookupFields({
                        type: 'customlist_qbt_method_type_list',
                        id: obj.type,
                        columns: ['name']
                    }).name;
                }

                if (obj.icode) {
                    var icode = search.lookupFields({
                        type: 'customrecord_qbt_interbanking_code',
                        id: obj.icode,
                        columns: ['name', 'custrecord_qbt_interbanking_code']
                    });
                    obj.icode = icode.name;
                }
                return obj;
            }
            return;
        }
    }

    function setConfigLang(){
        var lang = runtime.getCurrentUser().getPreference({name: 'LANGUAGE'}).split('_')[0];
        if(lang==='es'){
            dataMessage.isGroup = 'Es Grupo';
            dataMessage.isGroupHelp = 'Seleccionar si que quieren añadir métodos de pagos agrupados';
            dataMessage.MethodType = 'Método de Pago';
            dataMessage.MethodTypeHelp = 'Seleccione entre métodos de pagos';
            dataMessage.account = 'Otra cuenta contable';
            dataMessage.accountHelp = 'Cuenta contable personalizable para transacciones de medios de pago';
            dataMessage.type = 'Tipo de movimiento';
            dataMessage.typeHelp = 'Tipo de movimiento por el cual se utiliza el circuito del medio de pago';
            dataMessage.interbanking = 'Código Interbanking'
            dataMessage.interbankingHelp = 'Registro relacionado con el código interbanking definido por la entidad correspondiente';
            dataMessage.template = 'Plantilla';
            dataMessage.templateHelp = 'Plantilla asignada para impresión de cheques';
            dataMessage.nn = 'Número Siguiente';
            dataMessage.locData = 'Datos Localizados';
            dataMessage.paymet = 'Medio de pago';
            dataMessage.type = 'Tipo';
            dataMessage.interbcode = 'CÓDIGO INTERBANKING';
            dataMessage.details = 'Composición del medio de pago';
            dataMessage.subsidiary = 'Subsidiaria';
            dataMessage.labelFieldNumberValidPeriods = 'Número de periodos válidos';
            dataMessage.helpTextFieldNumberValidPeriods = 'Número de períodos válidos permitidos por la jurisdicción medidos en meses. un mes un período';
            dataMessage.labelFieldJurisdiction = 'Jurisdicción';
            dataMessage.helpTextFieldJurisdiction = 'Jurisdicción a la que pertenece el método de pago siempre que sea del tipo retención';
            
        }else if(lang==='en'){
            dataMessage.isGroup = 'Is Group';
            dataMessage.isGroupHelp = 'Select if want to add a group method type';
            dataMessage.MethodType = 'Method Type';
            dataMessage.MethodTypeHelp = 'Select between method types';
            dataMessage.account = 'Other account';
            dataMessage.accountHelp = 'Customizable account for transactions of means of payment';
            dataMessage.type = 'Movement type';
            dataMessage.typeHelp = 'Type of movement by which the circuit of the means of payment is used';
            dataMessage.interbanking = 'Interbanking Code'
            dataMessage.interbankingHelp = 'Registry related to the interbank code defined by the corresponding entity';
            dataMessage.template = 'Template';
            dataMessage.templateHelp = 'Assigned template for check printing';
            dataMessage.nn = 'Next Number';
            dataMessage.locData = 'Localization Data'; 
            dataMessage.paymet = 'Payment method';
            dataMessage.type = 'Type';
            dataMessage.interbcode = 'Interbanking Code';
            dataMessage.details = 'Payment method composition';
            dataMessage.subsidiary = 'Subsidiary';
            dataMessage.labelFieldNumberValidPeriods = 'Quantity of valid periods';
            dataMessage.helpTextFieldNumberValidPeriods = 'Number of valid periods allowed by the jurisdiction measured in months. one month one period';
            dataMessage.labelFieldJurisdiction = 'Jurisdiction';
            dataMessage.helpTextFieldJurisdiction = 'Jurisdiction to which the payment method belongs as long as it is of the withholding type';
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
