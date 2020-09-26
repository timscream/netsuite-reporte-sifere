/**
 *@NApiVersion 2.0
  *@NModuleScope Public
 *@NScriptType Suitelet
 */
define(['N/runtime','N/format'], function (runtime,format) {

    const dataMessage = {};

    function onRequest() {

    }

    function qbt_lib_loadPeriods(field, fortnight) {
        setConfigLang();
        var lang = runtime.getCurrentUser().getPreference({ name: "LANGUAGE" }).split('_')[0];
        var repeatString = function (string, n) {
            var repeatedString = "";
            while (n > 0) { repeatedString += string; n--; }
            return repeatedString;
        };
        var monthName = function (dt) {
            mlist = [
                (lang === 'en') ? "January" : "Enero",
                (lang === 'en') ? "February" : "Febrero",
                (lang === 'en') ? "March" : "Marzo",
                (lang === 'en') ? "April" : "Abril",
                (lang === 'en') ? "May" : "Mayo",
                (lang === 'en') ? "June" : "Junio",
                (lang === 'en') ? "July" : "Julio",
                (lang === 'en') ? "August" : "Agosto",
                (lang === 'en') ? "September" : "Septiembre",
                (lang === 'en') ? "October" : "Octubre",
                (lang === 'en') ? "November" : "Noviembre",
                (lang === 'en') ? "December" : "Diciembre"];
            return mlist[dt.getMonth()];
        };
        var yearsLimit = 1;

        for (var indexyear = yearsLimit; indexyear > -(yearsLimit); indexyear--) {
            var indexdate = new Date();
            indexdate.setDate(1);

            indexdate.setFullYear(indexdate.getFullYear() - indexyear);
            for (var indexmonth = 0; indexmonth < 12; indexmonth++) {
                indexdate.setMonth(indexmonth);
                var key = indexdate.getMonth() + '_' + indexdate.getFullYear();
                var text = monthName(indexdate) + ' - ' + indexdate.getFullYear();
                field.addSelectOption({
                    value: key,
                    text: text,
                    isSelected: indexdate.getMonth() == new Date().getMonth() && indexdate.getFullYear() == new Date().getFullYear()
                });
                //para crear las opciones quincenales
                if(fortnight) {
                    for(var per in [0,1]) {
                        text = repeatString('&nbsp;', 12) + '[' + (indexdate.getMonth() + 1) + '/' + indexdate.getFullYear() + '] ' + ((per == 0 ) ? (dataMessage.first_fn + ' ' + dataMessage.fortnight) : (dataMessage.sec_fn + ' ' + dataMessage.fortnight));
                        field.addSelectOption({
                            value: key + '_' + per,
                            text: text
                        });
                    }
                }
            }
        }
    }

    function setConfigLang(){
        var lang = runtime.getCurrentUser().getPreference({name: "LANGUAGE"}).split('_')[0];
        if(lang === 'es'){
            dataMessage.fortnight = 'quincena';
            dataMessage.first_fn = '1era';
            dataMessage.sec_fn = '2da';
        }
        else if(lang === 'en'){
            dataMessage.fortnight = 'fortnight';
            dataMessage.first_fn = '1st';
            dataMessage.sec_fn = '2nd';
        }
    }

    /**
     * Date
     * 20200924
     *
     * calculate the difference in months between 2 Dates 
     *
     * @param {Object Date} or {String Date}
     * @param {Object Date} or {String Date}
     * @return {Number}
     */
    function calculateMonths(dateB,dateA){
        //para el caso de fechas en String deben
        //tener el formato de la cuenta del usuario
        //o producira un error
        if(typeof dateB==="string"){
            dateB = formatStringDateToObjectDate(dateB);
        }

        if(typeof dateA==="string"){
            dateA = formatStringDateToObjectDate(dateA);
        }

        var yearBefore  = dateB.getFullYear()
        var monthBefore = dateB.getMonth()
        var yearAfter   = dateA.getFullYear()
        var monthAfter  = dateA.getMonth()
        var counter = 0;

        while ( yearBefore <= yearAfter ) {
            if ( yearBefore < yearAfter ) {
                (monthAfter == 0) ? counter++ : counter += (monthAfter+1);
                monthAfter = 11;
            } else if ( yearBefore === yearAfter ) {
                counter += (monthAfter - monthBefore)
            }
            yearAfter--;
        }
        return counter;
    }

    /**
     * Date
     * 20200924
     *
     * Objeto Date que es necesario transformar al formato
     * de la cuenta del usuario y en tipo String
     * e.g. para utilizar en filtros de busqueda
     * que requiere el valor de la fecha en String
     *
     * @param {Object Date}
     * @return {String Date}
     */
    function formatObjectDateToStringDate(formatDate) {
        formatDate = format.format({
            value: formatDate,
            type: format.Type.DATE
        });
        return formatDate;
    }

    /**
     * Date
     * 20200924
     *
     * String Date en formato de la cuenta del usuario 
     * pero es necesario cambiarla a Objeto
     * e.g. cuando se captura la fecha de un resultado
     * de busqueda pero dicha fecha hay que transformarla
     * en objeto para hacer calculos
     *
     * @param {String Date}
     * @return {Object Date}
     */
    function formatStringDateToObjectDate(formatDate) {
        formatDate = format.parse({
            value: formatDate,
            type: format.Type.DATE
        });
        return formatDate;
    }

    /**
     * Date
     * 20200924
     *
     * Crear Object Date con el ultimo dia del mes
     * se pasa como parametro el numero del año y mes
     * @param {Array}
     * @param {String} optional
     * @return {Object Date}
     */
    function lasDayOfTheMonth(period,returnLikeString) {
        var year = parseInt(period[1]);
        var month = parseInt(period[0])+1;
        var day = 0;
        var toDate = new Date(year,month,day,23,59,59);

        if(returnLikeString && returnLikeString==="returnLikeString"){
            toDate = formatObjectDateToStringDate(toDate);
        }

        return toDate;
    }

    /**
     * Date
     * 20200924
     *
     * Crear Object Date con el primer dia del mes
     * se pasa como parametro el numero del año y mes
     * @param {Array}
     * @return {Object Date}
     */
    function firstDayOfTheMonth(period,returnLikeString) {
        var year = parseInt(period[1])
        var month = parseInt(period[0])
        var day = 1
        var fromDate = new Date(year,month,day,0,0,0);

        if(returnLikeString && returnLikeString==="returnLikeString"){
            fromDate = formatObjectDateToStringDate(fromDate);
        }

        return fromDate;
    }

    /**
     * Date
     * 20200924
     *
     * Formatear la fecha de acuerdo al estandar del pais
     * para el caso de pasar como parametro un String Date
     * debe tener el mismo formato de la cuenta del usuario
     * si es un Object Date entonces no hay problema con tener
     * el formato de la cuenta del usuario o no tener el formato
     *
     * @param {String}
     * @param {Object Date} ó @param {String Date}
     * @return {String}
     */
    function getLocaleShortDateString(language,date)
    {
        function fill(s){
            s=''+s;
            return s.length>1?s:'0'+s;
        }

        var formats = {
            "en_US" : "M/d/yyyy",
            "es_CO" : "dd/MM/yyyy",
            "es_PE" : "dd/MM/yyyy",
            "es_AR" : "dd/MM/yyyy",
            "es_CL" : "dd-MM-yyyy"
        };
        
        if(typeof date==="string"){
            date = formatStringDateToObjectDate(date);
        }
        var y=date.getFullYear();
        var m=date.getMonth()+1;
        var d=date.getDate();
        formats = (language in formats) ? formats[language] : "MM/dd/yyyy";

        formats=formats.replace(/yyyy/,y);formats=formats.replace(/yy/,String(y).substr(2));
        formats=formats.replace(/MM/,fill(m));formats=formats.replace(/M/,m);
        formats=formats.replace(/dd/,fill(d));formats=formats.replace(/d/,d);
        return formats;
    }

    /**
     * Date
     * 20200924
     *
     * Purpose: Polyfill for Support the validation of Value "NaN"
     */
    Number.isNaN = Number.isNaN || function(value) {
        return typeof value === "number" && isNaN(value);
    }

    function setTaxId(taxId){
            return tax = taxId.substring(0,2) + '-'+ taxId.substring(2,10)+ '-'+ taxId.substring(10,11);
    }

    function padES5(str, size, left, char) {
        if (typeof str != 'string') {
            str = str.toString();
        }
        while (str.length < size) {
            if (left) {
                str = char + str;
            } else {
                str = str + char;
            }
        }
        if (str.length > size) {
            str = str.substr(str.length-size,size)
        }
        return str;
    };

    function numberWithCommas(x) {
        return x.toString().replace(/\./g,',');
    }

 return {
        onRequest: onRequest,
        qbt_lib_loadPeriods: qbt_lib_loadPeriods,
        qbt_lib_calculateMonths: calculateMonths,
        qbt_lib_firstDayOfTheMonth: firstDayOfTheMonth,
        qbt_lib_lasDayOfTheMonth: lasDayOfTheMonth,
        qbt_lib_formatObjectDateToStringDate: formatObjectDateToStringDate,
        qbt_lib_formatStringDateToObjectDate: formatStringDateToObjectDate,
        qbt_lib_getLocaleShortDateString : getLocaleShortDateString,
        qbt_lib_setTaxId: setTaxId,
        qbt_lib_padES5: padES5,
        qbt_lib_numberWithCommas: numberWithCommas
    }
});
