
    var Format = {
        rate: function (bps) {
            if (typeof bps !== 'number') {
                return '';
            }
            if (bps >= 1000000000) {
                return (bps / 1000000000).toFixed(2) + ' Gbit/s';
            }
            if (bps >= 1000000) {
                return (bps / 1000000).toFixed(2) + ' Mbit/s';
            }
            if (bps >= 1000) {
                return (bps / 1000).toFixed(2) + ' Kbit/s';
            }
            return bps.toFixed(2) + ' bit/s';
        }
        , time: function (seconds) {
            var date = new Date(seconds * 1000),
                days = parseInt(seconds / 86400, 10);
            days = days ? days + 'd ' : '';
            return days +
                ('0' + date.getUTCHours()).slice(-2) + ':' +
                ('0' + date.getUTCMinutes()).slice(-2) + ':' +
                ('0' + date.getUTCSeconds()).slice(-2);
        }
        , size: function (bytes) {
            if (typeof bytes !== 'number') {
                return '';
            }
            if (bytes >= 1000000000) {
                return (bytes / 1000000000).toFixed(2) + ' GB';
            }
            if (bytes >= 1000000) {
                return (bytes / 1000000).toFixed(2) + ' MB';
            }
            return (bytes / 1000).toFixed(2) + ' KB';
        }
    };
    FileManager.ProgressNumbersView = Marionette.ItemView.extend({
        template: '#progress-numbers-template'
        , modelEvents: {
            'change:rabbit': 'render'
        }
        , serializeData: function () {
            var start = this.model.get('start') || 1;
            var finish = this.model.get('finish') || 1;
            var rabbit = this.model.get('rabbit') || 1;
            var rate = 100;
            var data = {
                rate: Format.rate(rate)
                , time: Format.time((finish - rabbit) * 8 / rate)
                , percent_finished: (rabbit / finish * 100).toFixed(2)
                , amount_finished: Format.size(rabbit)
                , finish: Format.size(finish)
            };
            return data;
        }
    });
