function copy() {
    if (document.selection) { // IE
        var range = document.body.createTextRange();
        range.moveToElementText(document.getElementById("nom"));
        range.select();
    } else if (window.getSelection) {
        var range = document.createRange();
        range.selectNode(document.getElementById("nom"));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    }
    /* Select the text field */
    /* Copy the text inside the text field */
    document.execCommand('copy');
    alert("El token ha sido copiado al portapapeles");
}
(function () {
    var stateKey = 'random_state_key';

    /**
     * Obtains parameters from the hash of the URL
     * @return Object
     */
    function getHashParams(param) {
        var url_string = window.location.href;
        var url = new URL(url_string);
        var c = url.searchParams.get(param);
        return c;
    }

    /**
     * Generates a random string containing numbers and letters
     * @param  {number} length The length of the string
     * @return {string} The generated string
     */
    function generateRandomString(length) {
        var text = '';
        var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (var i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }


    var acces_code = getHashParams("code");
    if(acces_code!=null) {
        $.post("https://api.fib.upc.edu/v2/o/token",
            {
                grant_type: "authorization_code",
                redirect_uri: 'http://vps-ffc8b217.vps.ovh.net/raco/',
                code: acces_code,
                client_id: "fi7GYPofOE3KlcgQW17nqp9ktzBFkz9mLMOaS6eB",
                client_secret: "slG2vrxxuRSNsz60j5o3qMTljG9JxOa8oE81Y2lFL0z0teZqZsbItS5IljOrIKawEWIKmzLmvkOGlrYr7y8BCTtYt9mmSerIna96fjyjNaLwYh3BJ8qSoBMyzOVnfh0h"
            },
            function(data, status){
                $('#login').hide();
                $('#loggedin').show();
                $('#nom').text(data.refresh_token);
                let token_value = data.refresh_token
                $('#token_value').val(token_value);
        });
    }
    else {
        $('#login').show();
        $('#loggedin').hide();
    }
    $('#login-button').bind('click', function () {
        var client_id = 'fi7GYPofOE3KlcgQW17nqp9ktzBFkz9mLMOaS6eB';
        var redirect_uri = 'http://vps-ffc8b217.vps.ovh.net/raco/';
        var state = generateRandomString(16);
        localStorage.setItem(stateKey, state);
        var url = 'https://api.fib.upc.edu/v2/o/authorize/';
        url += '?client_id=' + encodeURIComponent(client_id);
        url += '&redirect_uri='+encodeURIComponent(redirect_uri);
        url += '&response_type=code';
        url += '&scope=read';
        url += '&state=' + encodeURIComponent(state);
        url += '&approval_prompt=auto';

        window.location = url;
    });
})();