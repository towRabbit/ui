import Ember from 'ember';
import ColumnView from 'ui/utils/column-view';

export default ColumnView.extend({
  columns: function() {
    var boxCount = 0;
    var idx = 0;
    var balancers = (this.get('context.balancers')||[]).sortBy('name');
    var columnCount = this.get('columnCount');
    var i;

    // Pre-initialize all the columns
    var columns = [];
    for ( i = 0 ; i < columnCount ; i++ )
    {
      columns[i] = [];
    }

    // Copy in the balancers
    for ( i = 0 ; i < balancers.get('length') ; i++ )
    {
      columns[nextIndex()].push(balancers.objectAt(i));
    }

    // Add a placeholder for where to put the 'Add Load Balancer' button
    columns[nextIndex()].push(Ember.Object.create({isNewPlaceHolder: true}));

    this.set('boxCount', boxCount);

    return columns;

    function nextIndex() {
      var out = idx;

      idx++;
      boxCount++;
      if ( idx >= columnCount )
      {
        idx = 0;
      }

      return out;
    }
  }.property('context.balancers.[]','columnCount'),
});
