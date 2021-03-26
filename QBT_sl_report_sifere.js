/**
 *@NApiVersion 2.0
 *@NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/config','N/runtime', 'N/search', './QBT_lib_common.js'],
function(serverWidget, config, runtime, search, qbt_lib_common) {
	const bootstrapCss = '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">';
	const bootstrapJs  = '<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>';
	const dataMessage  = {};
	var form = {};
	
	function setConfigLang() {
        var lang = runtime.getCurrentUser().getPreference({ name: "LANGUAGE" }).split('_')[0];
        if (lang === 'es') {
            dataMessage.titleForm = 'Informe de retención IIBB SIFERE';
            dataMessage.labelSearchButton = 'Buscar';
            dataMessage.labelResetButton = 'Limpiar Campos';
            dataMessage.labelFieldGroupSearchCriteria = 'Criterio de búsqueda';
            dataMessage.labelFieldGroupSearchResults = 'Resultado de búsqueda';
            dataMessage.labelFieldJurisdiction = 'Jurisdicción';
            dataMessage.labelFieldPeriod = 'Período';
            dataMessage.labelFieldCompany = 'Subsidiaria / Empresa';
            dataMessage.labelFieldDepartment = 'Departmento';
            dataMessage.labelFieldClass = 'Clase';
            dataMessage.labelFieldLocation = 'Ubicación';
        } else if (lang === 'en') {
            dataMessage.titleForm = 'Withholding Report IIBB SIFERE';
            dataMessage.labelSearchButton = 'Search';
            dataMessage.labelResetButton = 'Clear Fields';
            dataMessage.labelFieldGroupSearchCriteria = 'Search Criteria';
            dataMessage.labelFieldGroupSearchResults = 'Search Results';
            dataMessage.labelFieldJurisdiction = 'Jurisdiction';
            dataMessage.labelFieldPeriod = 'Period';
            dataMessage.labelFieldCompany = 'Subsidiary / Company';
            dataMessage.labelFieldDepartment = 'Department';
            dataMessage.labelFieldClass = 'Class';
            dataMessage.labelFieldLocation = 'Location';
        }
    }

	function getSubsidiarysOrSingleCompany(company) {
		try {
			var resulSet = search.create({
				type: search.Type.SUBSIDIARY,
				columns: ['internalid','name']
			});
			var pagedData = resulSet.runPaged({pageSize : 1000});
            for( var i=0; i < pagedData.pageRanges.length; i++ ) {
                var currentPage = pagedData.fetch(i);
                currentPage.data.forEach(function(result) {
                    company.addSelectOption({
                    	value : result.getValue('internalid')
                    	,text : result.getValue('name')
                    });
                });
            }
		} catch (e) {
			var resulSet = config.load({type: config.Type.COMPANY_INFORMATION})
			company.addSelectOption({
            	value : null
            	,text : resulSet.getValue({fieldId: 'name'})
            });
		}
	}

    function addingContentToForm() {

    	//agregando libreria bootstrap
	    	form.addField({
			    id : 'custpage_html_bootstrapcss',
			    type : serverWidget.FieldType.INLINEHTML,
			    label: 'bosstrapcss'
			}).defaultValue = bootstrapCss;

			form.addField({
			    id : 'custpage_html_bootstrapjs',
			    type : serverWidget.FieldType.INLINEHTML,
			    label: 'bosstrapjs'
			}).defaultValue = bootstrapJs;
		//agregando libreria bootstrap

    	// Creating Fields in Group Search Criteria

	    	// Creating Select and Options
			var select = form.addField({
			    id: 'custpage_jurisdiction',
			    type: serverWidget.FieldType.SELECT,
			    label: dataMessage.labelFieldJurisdiction,
			    container: 'searchcriteria',
			    source:'customrecord_qbt_jurisdictions'
			});
			// End Creating Select and Options
			
			// Creating Select and Options
			var period = form.addField({
			    id: 'custpage_period',
			    type: serverWidget.FieldType.SELECT,
			    label: dataMessage.labelFieldPeriod,
			    container: 'searchcriteria'
			});
			qbt_lib_common.qbt_lib_loadPeriods(period);
			// End Creating Select and Options

			// Creating Select and Options
			var company = form.addField({
			    id: 'custpage_company',
			    type: serverWidget.FieldType.SELECT,
			    label: dataMessage.labelFieldCompany,
			    container: 'searchcriteria'
			});
			getSubsidiarysOrSingleCompany(company)
			// End Creating Select and Options

			// Creating Select and Options
			if(runtime.isFeatureInEffect({ feature: 'DEPARTMENTS' })){
				var departments = form.addField({
				    id: 'custpage_department',
				    type: serverWidget.FieldType.SELECT,
				    label: dataMessage.labelFieldDepartment,
				    container: 'searchcriteria',
				    source: 'department'
				});
			}
			// End Creating Select and Options

			// Creating Select and Options
			if(runtime.isFeatureInEffect({ feature: 'CLASSES' })){
				var classes = form.addField({
				    id: 'custpage_class',
				    type: serverWidget.FieldType.SELECT,
				    label: dataMessage.labelFieldClass,
				    container: 'searchcriteria',
				    source: 'classification'
				});
			}
			// End Creating Select and Options

			// Creating Select and Options
			if(runtime.isFeatureInEffect({ feature: 'LOCATIONS' })){
				var classes = form.addField({
				    id: 'custpage_location',
				    type: serverWidget.FieldType.SELECT,
				    label: dataMessage.labelFieldLocation,
				    container: 'searchcriteria',
				    source: 'location'
				});
			}
			// End Creating Select and Options

		// End Creating Fields in Group Search Criteria

		// Creating Fields in Group Search Results

			form.addField({
			    id : 'custpage_html_field',
			    type : serverWidget.FieldType.INLINEHTML,
			    container: 'searchresults',
			    label: 'summary'
			}).defaultValue = "<div id='qbt_sifere_report_summary_container'><table class='table table-striped'><thead></thead></table></div>";

		// End Creating Fields in Group Search Results
    }

	function creatingForm() {
    	// Section One - Form
    	form = serverWidget.createForm({
    		title: dataMessage.titleForm
		});

    	// Add Client Script
		form.clientScriptModulePath = './QBT_cs_report_sifere.js';

    	// Creating Group Search Criteria
		var searchcriteria = form.addFieldGroup({
		    id : 'searchcriteria',
		    label : dataMessage.labelFieldGroupSearchCriteria
		});
		// End Creating Group Search Criteria

		// Creating Group Search Results
		var searchresults = form.addFieldGroup({
		    id : 'searchresults',
		    label : dataMessage.labelFieldGroupSearchResults
		});
		// End Creating Group Search Results

		// Creating Header Button
		form.addResetButton({
		    label: dataMessage.labelResetButton
		});

		form.addButton({
		    id : 'searchbutton',
		    label : dataMessage.labelSearchButton,
		    functionName: 'clickSearchButton'
		});
		// End Creating Header Button
    }
    
    function onRequest(context) {
        setConfigLang();

        if (context.request.method === 'GET') {
        	// Section One - Creating Forms
        	creatingForm()
        		addingContentToForm()
        	context.response.writePage(form);
        }
    }

    return {
        onRequest: onRequest
    }
});